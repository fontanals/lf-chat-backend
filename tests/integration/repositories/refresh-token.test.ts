import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/context";
import { RefreshToken } from "../../../src/models/entities/refresh-token";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import { RefreshTokenRepository } from "../../../src/repositories/refresh-token";
import {
  createTestPool,
  insertRefreshTokens,
  insertSessions,
  insertUsers,
  truncateRefreshTokens,
  truncateUsers,
} from "../../utils";

describe("RefreshTokenRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const refreshTokenRepository = new RefreshTokenRepository(dataContext);

  const users: User[] = [
    {
      id: randomUUID(),
      name: "User 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -50),
    },
    {
      id: randomUUID(),
      name: "User 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -102),
    },
  ];
  const sessions: Session[] = [
    {
      id: randomUUID(),
      userId: users[0].id,
      createdAt: addDays(new Date(), -5),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      createdAt: addDays(new Date(), -3),
    },
  ];
  const refreshTokens: RefreshToken[] = [
    {
      id: randomUUID(),
      token: "refresh-token-1",
      expiresAt: addDays(new Date(), 2),
      isRevoked: false,
      sessionId: sessions[0].id,
      createdAt: addDays(new Date(), -5),
    },
    {
      id: randomUUID(),
      token: "refresh-token-2",
      expiresAt: addDays(new Date(), 4),
      isRevoked: true,
      sessionId: sessions[1].id,
      createdAt: addDays(new Date(), -3),
    },
    {
      id: randomUUID(),
      token: "refresh-token-3",
      expiresAt: addDays(new Date(), 6),
      isRevoked: false,
      sessionId: sessions[1].id,
      createdAt: addDays(new Date(), -1),
    },
  ];

  beforeAll(async () => {
    await insertUsers(users, pool);
    await insertSessions(sessions, pool);
  });

  beforeEach(async () => {
    await insertRefreshTokens(refreshTokens, pool);
  });

  afterEach(async () => {
    await truncateRefreshTokens(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("findAll", () => {
    it("should return all refresh tokens", async () => {
      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      const expectedRefreshTokens = expect.arrayContaining(
        refreshTokens.map((refreshToken) =>
          expect.objectContaining(refreshToken)
        )
      );

      expect(databaseRefreshTokens).toEqual(expectedRefreshTokens);
    });
  });

  describe("findOne", () => {
    it("should return null when refresh token does not exist", async () => {
      const token = randomUUID();

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token,
      });

      expect(databaseRefreshToken).toBeNull();
    });

    it("should return refresh token", async () => {
      const refreshToken = refreshTokens[0];

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: refreshToken.token,
      });

      const expectedRefreshToken = expect.objectContaining(refreshToken);

      expect(databaseRefreshToken).toEqual(expectedRefreshToken);
    });
  });

  describe("create", () => {
    it("should create a new refresh token", async () => {
      const sessionId = sessions[1].id;

      const refreshToken: RefreshToken = {
        id: randomUUID(),
        token: "token",
        expiresAt: addDays(new Date(), 7),
        isRevoked: false,
        sessionId,
      };

      await refreshTokenRepository.create(refreshToken);

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      const expectedRefreshTokens = expect.arrayContaining(
        [...refreshTokens, refreshToken].map((refreshToken) =>
          expect.objectContaining(refreshToken)
        )
      );

      expect(databaseRefreshTokens).toEqual(expectedRefreshTokens);
    });
  });

  describe("update", () => {
    it("should revoke refresh token", async () => {
      const refreshTokenId = refreshTokens[0].id;

      await refreshTokenRepository.update(refreshTokenId, { isRevoked: true });

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      const expectedRefreshTokens = expect.arrayContaining(
        refreshTokens.map((refreshToken) =>
          refreshToken.id === refreshTokenId
            ? expect.objectContaining({ ...refreshToken, isRevoked: true })
            : expect.objectContaining(refreshToken)
        )
      );

      expect(databaseRefreshTokens).toEqual(expectedRefreshTokens);
    });
  });

  describe("revokeSession", () => {
    it("should revoke all refresh tokens from session", async () => {
      const sessionId = sessions[0].id;

      await refreshTokenRepository.revokeSession(sessionId);

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      const expectedRefreshTokens = expect.arrayContaining(
        refreshTokens.map((refreshToken) =>
          refreshToken.sessionId === sessionId
            ? expect.objectContaining({ ...refreshToken, isRevoked: true })
            : expect.objectContaining(refreshToken)
        )
      );

      expect(databaseRefreshTokens).toEqual(expectedRefreshTokens);
    });
  });
});
