import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../src/config";
import { DataContext } from "../../../src/data/data-context";
import { RefreshToken } from "../../../src/models/entities/refresh-token";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import {
  RecoverPasswordRequest,
  ResetPasswordRequest,
  SigninRequest,
  SignupRequest,
  VerifyAccountRequest,
} from "../../../src/models/requests/auth";
import { RefreshTokenRepository } from "../../../src/repositories/refresh-token";
import { SessionRepository } from "../../../src/repositories/session";
import { UserRepository } from "../../../src/repositories/user";
import { AuthContext, AuthService } from "../../../src/services/auth";
import { EmailService } from "../../../src/services/email";
import { Logger } from "../../../src/services/logger";
import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";
import {
  createTestPool,
  insertRefreshTokens,
  insertSessions,
  insertUsers,
  truncateUsers,
} from "../../utils";

describe("AuthService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const userRepository = new UserRepository(dataContext);
  const sessionRepository = new SessionRepository(dataContext);
  const refreshTokenRepository = new RefreshTokenRepository(dataContext);
  const emailService = new EmailService();
  const logger = new Logger();
  const authService = new AuthService(
    dataContext,
    userRepository,
    sessionRepository,
    refreshTokenRepository,
    emailService,
    logger
  );

  const mockUsers: User[] = Array.from({ length: 6 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    verificationToken:
      index == 4
        ? jsonwebtoken.sign(
            { email: `user${index + 1}@example.com` },
            config.ACCOUNT_VERIFICATION_TOKEN_SECRET,
            { expiresIn: "15m" }
          )
        : null,
    recoveryToken:
      index === 5
        ? jsonwebtoken.sign(
            { email: `user${index + 1}@example.com` },
            config.PASSWORD_RECOVERY_TOKEN_SECRET,
            { expiresIn: "15m" }
          )
        : null,
    isVerified: index !== 4,
    createdAt: addDays(new Date(), -10 + index),
    updatedAt: addDays(new Date(), -10 + index),
  }));

  const mockSessions: Session[] = mockUsers.map((user) => ({
    id: randomUUID(),
    expiresAt: addDays(user.createdAt!, 7),
    userId: user.id,
    createdAt: user.createdAt,
  }));

  const mockRefreshTokens: RefreshToken[] = mockSessions.flatMap(
    (session, sessionIndex) =>
      Array.from({ length: 2 }, (_, index) => {
        const user = mockUsers.find((user) => user.id === session.userId)!;

        return {
          id: randomUUID(),
          token: jsonwebtoken.sign(
            {
              session: {
                id: session.id,
                userId: session.userId,
                expiresAt: session.expiresAt.toISOString(),
                createdAt: session.createdAt!.toISOString(),
              },
              user: { id: user.id, name: user.name, email: user.email },
              iat: Math.floor(
                addDays(session.createdAt!, index).getTime() / 1000
              ),
              exp: Math.floor(session.expiresAt.getTime() / 1000),
            },
            config.REFRESH_TOKEN_SECRET
          ),
          expiresAt: session.expiresAt,
          isRevoked: sessionIndex === 4 && index === 1,
          sessionId: session.id,
          createdAt: addDays(session.createdAt!, index),
          updatedAt: addDays(session.createdAt!, index),
        };
      })
  );

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password", 10);

    await insertUsers(
      mockUsers.map((user) => ({ ...user, password: hashedPassword })),
      pool
    );

    await insertSessions(mockSessions, pool);
    await insertRefreshTokens(mockRefreshTokens, pool);
  });

  afterEach(async () => {
    await truncateUsers(pool);
  });

  afterAll(async () => {
    await pool.end();
    emailService.close();
  });

  describe("signup", () => {
    it("should create unverified user with account verification token, send account verification email and return user email", async () => {
      const request: SignupRequest = {
        name: "New User",
        email: "new.user@example.com",
        password: "password",
      };

      const response = await authService.signup(request);

      const databaseUser = await userRepository.findOne({
        email: request.email,
      });

      if (databaseUser == null) {
        fail("Expected user to be created.");
      }

      expect(databaseUser).toEqual({
        id: expect.any(String),
        name: request.name,
        email: request.email,
        password: expect.any(String),
        displayName: request.name.split(" ")[0],
        customPrompt: null,
        verificationToken: expect.any(String),
        recoveryToken: null,
        isVerified: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      const isPasswordCorrect = await bcrypt.compare(
        "password",
        databaseUser.password
      );

      expect(isPasswordCorrect).toBe(true);

      expect(
        jsonwebtoken.verify(
          databaseUser.verificationToken!,
          config.ACCOUNT_VERIFICATION_TOKEN_SECRET
        )
      ).toEqual(expect.objectContaining({ email: request.email }));

      expect(response).toBe(request.email);
    });
  });

  describe("verifyAccount", () => {
    it("should verify account and return user email", async () => {
      const mockUser = mockUsers[4];

      const request: VerifyAccountRequest = {
        token: mockUser.verificationToken!,
      };

      const response = await authService.verifyAccount(request);

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          mockUsers.map((user) =>
            user.id === mockUser.id
              ? {
                  ...user,
                  password: expect.any(String),
                  verificationToken: null,
                  isVerified: true,
                  updatedAt: expect.any(Date),
                }
              : { ...user, password: expect.any(String) }
          )
        )
      );

      expect(response).toBe(mockUser.email);
    });
  });

  describe("signin", () => {
    it("should create a new session and refresh token and return the session, user and the access tokens", async () => {
      const mockUser = mockUsers[0];

      const request: SigninRequest = {
        email: mockUser.email,
        password: mockUser.password,
      };

      const { accessToken, refreshToken, response } = await authService.signin(
        request
      );

      const databaseSession = await sessionRepository.findOne({
        id: response.session.id,
      });

      if (databaseSession == null) {
        fail("Expected session to be created.");
      }

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: refreshToken,
      });

      if (databaseRefreshToken == null) {
        fail("Expected refresh token to be created.");
      }

      expect(
        jsonwebtoken.verify(accessToken, config.ACCESS_TOKEN_SECRET)
      ).toEqual(
        expect.objectContaining({
          session: {
            id: response.session.id,
            expiresAt: response.session.expiresAt.toISOString(),
            userId: response.session.userId,
          },
          user: {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
          },
        })
      );

      expect(
        jsonwebtoken.verify(refreshToken, config.REFRESH_TOKEN_SECRET)
      ).toEqual(
        expect.objectContaining({
          session: {
            id: response.session.id,
            expiresAt: response.session.expiresAt.toISOString(),
            userId: response.session.userId,
          },
          user: {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
          },
        })
      );

      expect(databaseSession).toEqual({
        ...response.session,
        createdAt: expect.any(Date),
      });

      expect(databaseRefreshToken).toEqual({
        id: expect.any(String),
        token: expect.any(String),
        isRevoked: false,
        expiresAt: expect.any(Date),
        sessionId: response.session.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(databaseRefreshToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
        addDays(new Date(), 6).getTime()
      );

      expect(response).toEqual({
        session: {
          id: expect.any(String),
          expiresAt: expect.any(Date),
          userId: mockUser.id,
        },
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          displayName: mockUser.displayName,
          customPrompt: mockUser.customPrompt,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
    });
  });

  describe("signout", () => {
    it("should signout user revoking session and return user id", async () => {
      const mockUser = mockUsers[mockUsers.length - 1];
      const mockSession = mockSessions[mockSessions.length - 1];

      const authContext: AuthContext = {
        session: {
          id: mockSession.id,
          expiresAt: mockSession.expiresAt.toISOString(),
          userId: mockSession.userId,
          createdAt: mockSession.createdAt!.toISOString(),
        },
        user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
      };

      const response = await authService.signout(authContext);

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      expect(databaseRefreshTokens).toEqual(
        expect.arrayContaining(
          mockRefreshTokens.map((refreshToken) =>
            refreshToken.sessionId === mockSession.id
              ? {
                  ...refreshToken,
                  isRevoked: true,
                  updatedAt: expect.any(Date),
                }
              : refreshToken
          )
        )
      );

      expect(response).toEqual(mockUser.id);
    });
  });

  describe("recoverPassword", () => {
    it("should set password recovery token, send password recovery email and return user email", async () => {
      const mockUser = mockUsers[0];

      const request: RecoverPasswordRequest = { email: mockUser.email };

      const response = await authService.recoverPassword(request);

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          mockUsers.map((user) =>
            user.id === mockUser.id
              ? {
                  ...user,
                  password: expect.any(String),
                  recoveryToken: expect.any(String),
                  updatedAt: expect.any(Date),
                }
              : { ...user, password: expect.any(String) }
          )
        )
      );

      expect(response).toBe(mockUser.email);
    });
  });

  describe("resetPassword", () => {
    it("should reset password and return user email", async () => {
      const mockUser = mockUsers[5];

      const request: ResetPasswordRequest = {
        token: mockUser.recoveryToken!,
        newPassword: "new-password",
      };

      const response = await authService.resetPassword(request);

      const databaseUsers = await userRepository.findAll();

      const databaseUser = databaseUsers.find(
        (user) => user.id === mockUser.id
      );

      if (databaseUser == null) {
        fail("Expected user to be found");
      }

      const isPasswordCorrect = await bcrypt.compare(
        request.newPassword,
        databaseUser.password
      );

      expect(isPasswordCorrect).toBe(true);

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          mockUsers.map((user) =>
            user.id === mockUser.id
              ? {
                  ...user,
                  password: expect.any(String),
                  recoveryToken: null,
                  updatedAt: expect.any(Date),
                }
              : { ...user, password: expect.any(String) }
          )
        )
      );

      expect(response).toBe(mockUser.email);
    });
  });

  describe("refreshToken", () => {
    it("should throw an unauthorized error and revoke session when refresh token is revoked", async () => {
      const mockRefreshToken = mockRefreshTokens.find(
        (refreshToken) => refreshToken.isRevoked
      )!;

      try {
        await authService.refreshToken(mockRefreshToken.token);

        fail("Expected to throw unauthorized error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.Unauthorized
        );
      }

      const databaseRefreshTokens = await refreshTokenRepository.findAll({
        sessionId: mockRefreshToken.sessionId,
      });

      expect(databaseRefreshTokens).toEqual(
        expect.arrayContaining(
          mockRefreshTokens
            .filter(
              (refreshToken) =>
                refreshToken.sessionId === mockRefreshToken.sessionId
            )
            .map((refreshToken) => ({
              ...refreshToken,
              isRevoked: true,
              updatedAt: expect.any(Date),
            }))
        )
      );
    });

    it("should throw a session expired error and revoke expired token", async () => {
      const mockRefreshToken = mockRefreshTokens[1];

      try {
        await authService.refreshToken(mockRefreshToken.token);

        fail("Expected to throw session expired error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.SessionExpired
        );
      }

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: mockRefreshToken.token,
      });

      expect(databaseRefreshToken).toEqual({
        ...mockRefreshToken,
        isRevoked: true,
        updatedAt: expect.any(Date),
      });
    });

    it("should refresh token revoking previous", async () => {
      const mockUser = mockUsers[mockUsers.length - 1];
      const mockSession = mockSessions[mockSessions.length - 1];
      const mockRefreshToken = mockRefreshTokens[mockRefreshTokens.length - 1];

      const result = await authService.refreshToken(mockRefreshToken.token);

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        id: mockRefreshToken.id,
      });

      const databaseNewRefreshToken = await refreshTokenRepository.findOne({
        token: result.refreshToken,
      });

      if (databaseNewRefreshToken == null) {
        fail("Expected new refresh token to be created.");
      }

      expect(
        jsonwebtoken.verify(result.accessToken, config.ACCESS_TOKEN_SECRET)
      ).toEqual(
        expect.objectContaining({
          session: {
            id: mockSession.id,
            expiresAt: mockSession.expiresAt.toISOString(),
            userId: mockSession.userId,
            createdAt: mockSession.createdAt?.toISOString(),
          },
          user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
        })
      );

      expect(
        jsonwebtoken.verify(result.refreshToken, config.REFRESH_TOKEN_SECRET)
      ).toEqual(
        expect.objectContaining({
          session: {
            id: mockSession.id,
            expiresAt: mockSession.expiresAt.toISOString(),
            userId: mockSession.userId,
            createdAt: mockSession.createdAt?.toISOString(),
          },
          user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
        })
      );

      expect(databaseRefreshToken).toEqual({
        ...mockRefreshToken,
        isRevoked: true,
        updatedAt: expect.any(Date),
      });

      expect(databaseNewRefreshToken).toEqual({
        id: expect.any(String),
        token: expect.any(String),
        isRevoked: false,
        expiresAt: mockSession.expiresAt,
        sessionId: mockSession.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(result).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        authContext: expect.objectContaining({
          session: {
            id: mockSession.id,
            expiresAt: mockSession.expiresAt.toISOString(),
            userId: mockSession.userId,
            createdAt: mockSession.createdAt?.toISOString(),
          },
          user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
        }),
      });
    });
  });
});
