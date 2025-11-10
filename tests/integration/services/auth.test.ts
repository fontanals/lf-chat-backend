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
  SigninRequest,
  SignupRequest,
} from "../../../src/models/requests/auth";
import { RefreshTokenRepository } from "../../../src/repositories/refresh-token";
import { SessionRepository } from "../../../src/repositories/session";
import { UserRepository } from "../../../src/repositories/user";
import { AuthContext, AuthService } from "../../../src/services/auth";
import {
  createTestPool,
  insertRefreshTokens,
  insertSessions,
  insertUsers,
  truncateSessions,
  truncateUsers,
} from "../../utils";

describe("AuthService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const userRepository = new UserRepository(dataContext);
  const sessionRepository = new SessionRepository(dataContext);
  const refreshTokenRepository = new RefreshTokenRepository(dataContext);
  const authService = new AuthService(
    dataContext,
    userRepository,
    sessionRepository,
    refreshTokenRepository
  );

  const mockUsers: User[] = Array.from({ length: 6 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
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

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash("password", 10);

    await insertUsers(
      mockUsers.map((user) => ({ ...user, password: hashedPassword })),
      pool
    );
  });

  beforeEach(async () => {
    await insertSessions(mockSessions, pool);
    await insertRefreshTokens(mockRefreshTokens, pool);
  });

  afterEach(async () => {
    await truncateSessions(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("signup", () => {
    it("should signup a new user creating a user, session, and refresh token", async () => {
      const request: SignupRequest = {
        name: "New User",
        email: "new.user@example.com",
        password: "password",
      };

      const { refreshToken, response } = await authService.signup(request);

      const databaseUser = await userRepository.findOne({
        id: response.user.id,
      });

      if (databaseUser == null) {
        fail("Expected user to be created.");
      }

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

      expect(databaseUser).toEqual(
        expect.objectContaining({
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
        })
      );
      expect(databaseSession).toEqual(
        expect.objectContaining({
          id: response.session.id,
          userId: response.session.userId,
        })
      );
      expect(databaseRefreshToken).toEqual(
        expect.objectContaining({
          sessionId: response.session.id,
          isRevoked: false,
        })
      );
      expect(databaseRefreshToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
        addDays(new Date(), 6).getTime()
      );
      expect(response).toEqual({
        session: {
          id: databaseSession.id,
          expiresAt: databaseSession.expiresAt,
          userId: databaseUser.id,
        },
        user: {
          id: databaseUser.id,
          name: request.name,
          email: request.email,
          displayName: databaseUser.displayName,
          customPrompt: databaseUser.customPrompt,
        },
      });
    });
  });

  describe("signin", () => {
    it("should signin a user creating a session and refresh token", async () => {
      const mockUser = mockUsers[0];

      const request: SigninRequest = {
        email: mockUser.email,
        password: mockUser.password,
      };

      const { refreshToken, response } = await authService.signin(request);

      const databaseUser = await userRepository.findOne({
        id: response.user.id,
      });

      if (databaseUser == null) {
        fail("Expected user to be found.");
      }

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

      expect(databaseUser).toEqual(
        expect.objectContaining({
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
        })
      );

      expect(databaseSession).toEqual(
        expect.objectContaining({
          id: response.session.id,
          userId: response.session.userId,
        })
      );

      expect(databaseRefreshToken).toEqual(
        expect.objectContaining({
          sessionId: response.session.id,
          isRevoked: false,
        })
      );

      expect(databaseRefreshToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
        addDays(new Date(), 6).getTime()
      );

      expect(response).toEqual({
        session: {
          id: databaseSession.id,
          expiresAt: databaseSession.expiresAt,
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

  describe("refreshToken", () => {
    it("should revoke session when refresh token is revoked", async () => {
      const targetMockRefreshToken = mockRefreshTokens.find(
        (refreshToken) => refreshToken.isRevoked
      )!;

      const response = await authService.refreshToken(
        targetMockRefreshToken.token
      );

      const databaseRefreshTokens = await refreshTokenRepository.findAll({
        sessionId: targetMockRefreshToken.sessionId,
      });

      expect(response).toEqual({ isValid: false });

      expect(databaseRefreshTokens).toEqual(
        expect.arrayContaining(
          mockRefreshTokens
            .filter(
              (refreshToken) =>
                refreshToken.sessionId === targetMockRefreshToken.sessionId
            )
            .map((refreshToken) =>
              expect.objectContaining({
                ...refreshToken,
                isRevoked: true,
                updatedAt: expect.any(Date),
              })
            )
        )
      );
    });

    it("should revoke expired token", async () => {
      const mockRefreshToken = mockRefreshTokens[1];

      const response = await authService.refreshToken(mockRefreshToken.token);

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: mockRefreshToken.token,
      });

      expect(response).toEqual({ isValid: false });

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

      const response = await authService.refreshToken(mockRefreshToken.token);

      if (!response.isValid) {
        fail("Expected refresh token to be valid.");
      }

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        id: mockRefreshToken.id,
      });

      const databaseNewRefreshToken = await refreshTokenRepository.findOne({
        token: response.refreshToken,
      });

      if (databaseNewRefreshToken == null) {
        fail("Expected new refresh token to be created.");
      }

      expect(databaseRefreshToken).toEqual({
        ...mockRefreshToken,
        isRevoked: true,
        updatedAt: expect.any(Date),
      });

      expect(databaseNewRefreshToken).toEqual(
        expect.objectContaining({
          sessionId: mockRefreshToken.sessionId,
          isRevoked: false,
        })
      );

      expect(
        databaseNewRefreshToken.expiresAt.getTime()
      ).toBeGreaterThanOrEqual(addDays(new Date(), 6).getTime());

      expect(response).toEqual({
        isValid: true,
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
