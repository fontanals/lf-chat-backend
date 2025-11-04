import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../src/config";
import { DataContext } from "../../../src/data/data-context";
import { RefreshToken } from "../../../src/models/entities/refresh-token";
import { Session } from "../../../src/models/entities/session";
import { mapUserToDto, User } from "../../../src/models/entities/user";
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

  const users: User[] = [
    {
      id: randomUUID(),
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -50),
    },
  ];
  const sessions: Session[] = [
    {
      id: randomUUID(),
      userId: users[0].id,
      createdAt: addDays(new Date(), -50),
    },
  ];
  const authContext: AuthContext = {
    session: sessions[0],
    user: mapUserToDto(users[0]),
  };
  const generateRefreshToken = (expiresAt: Date) => {
    return jsonwebtoken.sign(
      { ...authContext, exp: Math.floor(expiresAt.getTime() / 1000) },
      config.REFRESH_TOKEN_SECRET
    );
  };
  const refreshTokens: RefreshToken[] = [
    {
      id: randomUUID(),
      token: generateRefreshToken(addDays(new Date(), -2)),
      expiresAt: addDays(new Date(), -2),
      isRevoked: true,
      sessionId: sessions[0].id,
      createdAt: addDays(new Date(), -9),
    },
    {
      id: randomUUID(),
      token: generateRefreshToken(addDays(new Date(), -1)),
      expiresAt: addDays(new Date(), -1),
      isRevoked: false,
      sessionId: sessions[0].id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      token: generateRefreshToken(addDays(new Date(), 2)),
      expiresAt: addDays(new Date(), 2),
      isRevoked: false,
      sessionId: sessions[0].id,
      createdAt: addDays(new Date(), -4),
    },
  ];

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash("password", 10);

    await insertUsers(
      users.map((user) => ({ ...user, password: hashedPassword })),
      pool
    );
  });

  beforeEach(async () => {
    await insertSessions(sessions, pool);
    await insertRefreshTokens(refreshTokens, pool);
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
        name: "User 2",
        email: "user2@example.com",
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
        session: { id: databaseSession.id, userId: databaseUser.id },
        user: {
          id: databaseUser.id,
          name: request.name,
          email: request.email,
        },
      });
    });
  });

  describe("signin", () => {
    it("should signin a user creating a session and refresh token", async () => {
      const user = users[0];

      const request: SigninRequest = {
        email: user.email,
        password: user.password,
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
        session: { id: databaseSession.id, userId: user.id },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
    });
  });

  describe("refreshToken", () => {
    it("should revoke session when refresh token is revoked", async () => {
      const targetRefreshToken = refreshTokens[0];

      const response = await authService.refreshToken(targetRefreshToken.token);

      const databaseRefreshTokens = await refreshTokenRepository.findAll({
        sessionId: targetRefreshToken.sessionId,
      });

      expect(response).toEqual({ isValid: false });
      expect(databaseRefreshTokens).toEqual(
        expect.arrayContaining(
          refreshTokens
            .filter(
              (refreshToken) =>
                refreshToken.sessionId === targetRefreshToken.sessionId
            )
            .map((refreshToken) =>
              expect.objectContaining({ ...refreshToken, isRevoked: true })
            )
        )
      );
    });

    it("should revoke expired token", async () => {
      const refreshToken = refreshTokens[1];

      const response = await authService.refreshToken(refreshToken.token);

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: refreshToken.token,
      });

      expect(response).toEqual({ isValid: false });
      expect(databaseRefreshToken).toEqual({
        ...refreshToken,
        isRevoked: true,
      });
    });

    it("should refresh token revoking previous", async () => {
      const user = users[0];
      const session = sessions[0];
      const refreshToken = refreshTokens[2];

      const response = await authService.refreshToken(refreshToken.token);

      if (!response.isValid) {
        fail("Expected refresh token to be valid.");
      }

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        id: refreshToken.id,
      });

      const databaseNewRefreshToken = await refreshTokenRepository.findOne({
        token: response.refreshToken,
      });

      if (databaseNewRefreshToken == null) {
        fail("Expected new refresh token to be created.");
      }

      expect(databaseRefreshToken).toEqual({
        ...refreshToken,
        isRevoked: true,
      });
      expect(databaseNewRefreshToken).toEqual(
        expect.objectContaining({
          sessionId: refreshToken.sessionId,
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
            id: session.id,
            userId: session.userId,
            createdAt: session.createdAt?.toISOString(),
          },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt?.toISOString(),
          },
        }),
      });
    });
  });
});
