import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import jsonwebtoken from "jsonwebtoken";
import { Pool } from "pg";
import { config } from "../../../src/config";
import { DataContext } from "../../../src/data/context";
import { RefreshToken } from "../../../src/models/entities/refresh-token";
import {
  SigninRequest,
  SignupRequest,
} from "../../../src/models/requests/auth";
import { RefreshTokenRepository } from "../../../src/repositories/refresh-token";
import { SessionRepository } from "../../../src/repositories/session";
import { UserRepository } from "../../../src/repositories/user";
import { AuthContext, AuthService } from "../../../src/services/auth";
import { NumberUtils } from "../../../src/utils/numbers";
import { SqlUtils } from "../../../src/utils/sql";
import { testConfig } from "../../config";

describe("AuthService", () => {
  const pool = new Pool({
    host: testConfig.TEST_POSTGRES_HOST,
    port: NumberUtils.safeParseInt(testConfig.TEST_POSTGRES_PORT, 5432),
    user: testConfig.TEST_POSTGRES_USER,
    password: testConfig.TEST_POSTGRES_PASSWORD,
    database: testConfig.TEST_POSTGRES_DB,
  });
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

  const userId = randomUUID();
  const session1Id = randomUUID();
  const session2Id = randomUUID();

  const authContext: AuthContext = {
    session: { id: session2Id, userId },
    user: { id: userId, name: "John Doe", email: "john_doe@example.com" },
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
      sessionId: session1Id,
      createdAt: addDays(new Date(), -9),
    },
    {
      id: randomUUID(),
      token: generateRefreshToken(addDays(new Date(), -1)),
      expiresAt: addDays(new Date(), -1),
      isRevoked: false,
      sessionId: session1Id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      token: generateRefreshToken(addDays(new Date(), 2)),
      expiresAt: addDays(new Date(), 2),
      isRevoked: false,
      sessionId: session1Id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      token: generateRefreshToken(addDays(new Date(), -7)),
      expiresAt: addDays(new Date(), -7),
      isRevoked: true,
      sessionId: session2Id,
      createdAt: addDays(new Date(), -14),
    },
    {
      id: randomUUID(),
      token: generateRefreshToken(addDays(new Date(), 4)),
      expiresAt: addDays(new Date(), 4),
      isRevoked: false,
      sessionId: session2Id,
      createdAt: addDays(new Date(), -2),
    },
  ];

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO "user"
      (id, name, email, password)
      VALUES
      ($1, 'John Doe', 'john_doe@example.com', 'password');`,
      [userId]
    );
  });

  beforeEach(async () => {
    await pool.query(
      `INSERT INTO "session"
      (id, user_id)
      VALUES
      ($1, $3),
      ($2, $3);`,
      [session1Id, session2Id, userId]
    );

    await pool.query(
      `INSERT INTO "refresh_token"
      (id, token, expires_at, is_revoked, session_id, created_at)
      VALUES
      ${SqlUtils.values(refreshTokens.length, 6)};`,
      refreshTokens.flatMap((refreshToken) => [
        refreshToken.id,
        refreshToken.token,
        refreshToken.expiresAt,
        refreshToken.isRevoked,
        refreshToken.sessionId,
        refreshToken.createdAt,
      ])
    );
  });

  afterEach(async () => {
    await pool.query(`TRUNCATE "session" CASCADE;`);
  });

  afterAll(async () => {
    await pool.query(`TRUNCATE "user" CASCADE;`);
    await pool.end();
  });

  describe("signup", () => {
    it("should signup a new user creating a user, session, and refresh token", async () => {
      const request: SignupRequest = {
        name: "Jane Doe",
        email: "jane_doe@example.com",
        password: "password",
      };

      const { response } = await authService.signup(request);

      const user = await userRepository.findOne({ email: request.email });
      const session = await sessionRepository.findOne({
        id: response.session.id,
      });

      if (user == null) {
        fail("Expected user to be created.");
      }

      if (session == null) {
        fail("Expected session to be created.");
      }

      expect(user).toEqual(
        expect.objectContaining({
          name: "Jane Doe",
          email: "jane_doe@example.com",
        })
      );
      expect(session).toEqual(expect.objectContaining({ userId: user.id }));
      expect(response).toEqual({
        session: { id: session.id, userId: user.id },
        user: {
          id: user.id,
          name: "Jane Doe",
          email: "jane_doe@example.com",
        },
      });
    });
  });

  describe("signin", () => {
    it("should signin a user creating a session and refresh token", async () => {
      const request: SigninRequest = {
        email: "jane_doe@example.com",
        password: "password",
      };

      const { response } = await authService.signin(request);

      const user = await userRepository.findOne({ email: request.email });
      const session = await sessionRepository.findOne({
        id: response.session.id,
      });

      if (user == null) {
        fail("Expected user to be found.");
      }

      if (session == null) {
        fail("Expected session to be created.");
      }

      expect(user).toEqual(
        expect.objectContaining({
          name: "Jane Doe",
          email: "jane_doe@example.com",
        })
      );
      expect(session).toEqual(expect.objectContaining({ userId: user.id }));
      expect(response).toEqual({
        session: { id: session.id, userId: user.id },
        user: {
          id: user.id,
          name: "Jane Doe",
          email: "jane_doe@example.com",
          createdAt: expect.any(Date),
        },
      });
    });
  });

  describe("refreshToken", () => {
    it("should revoke session when refresh token is revoked", async () => {
      const { isValid } = await authService.refreshToken(
        refreshTokens[3].token
      );

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      const expectedRefreshTokens = expect.arrayContaining(
        refreshTokens.map((refreshToken) =>
          refreshToken.sessionId === session2Id
            ? expect.objectContaining({ ...refreshToken, isRevoked: true })
            : expect.objectContaining(refreshToken)
        )
      );

      expect(isValid).toBe(false);
      expect(databaseRefreshTokens).toEqual(expectedRefreshTokens);
    });

    it("should revoke expired token", async () => {
      const { isValid } = await authService.refreshToken(
        refreshTokens[1].token
      );

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      const expectedRefreshTokens = expect.arrayContaining(
        refreshTokens.map((refreshToken, index) =>
          index === 1
            ? expect.objectContaining({ ...refreshToken, isRevoked: true })
            : expect.objectContaining(refreshToken)
        )
      );

      expect(isValid).toBe(false);
      expect(databaseRefreshTokens).toEqual(expectedRefreshTokens);
    });

    it("should refresh token revoking the previous token", async () => {
      const { isValid } = await authService.refreshToken(
        refreshTokens[2].token
      );

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      const expectedRefreshTokens = expect.arrayContaining(
        refreshTokens.map((refreshToken, index) =>
          index === 2
            ? expect.objectContaining({ ...refreshToken, isRevoked: true })
            : expect.objectContaining(refreshToken)
        )
      );

      expect(isValid).toBe(true);
      expect(databaseRefreshTokens).toEqual(expectedRefreshTokens);
    });
  });
});
