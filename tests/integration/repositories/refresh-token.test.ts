import { randomUUID } from "crypto";
import { DataContext } from "../../../src/data/data-context";
import { RefreshToken } from "../../../src/models/entities/refresh-token";
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

  const mockUsers: User[] = Array.from({ length: 3 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mockSessions = mockUsers.flatMap((user) =>
    Array.from({ length: 2 }, () => ({
      id: randomUUID(),
      expiresAt: new Date(),
      userId: user.id,
      createdAt: new Date(),
    }))
  );

  const mockRefreshTokens: RefreshToken[] = mockSessions.flatMap((session) =>
    Array.from({ length: 5 }, () => ({
      id: randomUUID(),
      token: randomUUID(),
      expiresAt: session.expiresAt,
      isRevoked: false,
      sessionId: session.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  beforeAll(async () => {
    await insertUsers(mockUsers, pool);
    await insertSessions(mockSessions, pool);
  });

  beforeEach(async () => {
    await insertRefreshTokens(mockRefreshTokens, pool);
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

      expect(databaseRefreshTokens).toEqual(mockRefreshTokens);
    });
  });

  describe("findOne", () => {
    it("should return null when refresh token does not exist", async () => {
      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: randomUUID(),
      });

      expect(databaseRefreshToken).toBeNull();
    });

    it("should return refresh token", async () => {
      const mockRefreshToken = mockRefreshTokens[0];

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: mockRefreshToken.token,
      });

      expect(databaseRefreshToken).toEqual(mockRefreshToken);
    });
  });

  describe("create", () => {
    it("should create a new refresh token", async () => {
      const mockSession = mockSessions[0];

      const newRefreshToken: RefreshToken = {
        id: randomUUID(),
        token: "token",
        expiresAt: mockSession.expiresAt,
        isRevoked: false,
        sessionId: mockSession.id,
      };

      await refreshTokenRepository.create(newRefreshToken);

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      expect(databaseRefreshTokens).toEqual(
        expect.arrayContaining([
          ...mockRefreshTokens,
          {
            ...newRefreshToken,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );
    });
  });

  describe("update", () => {
    it("should revoke refresh token", async () => {
      const mockRefreshToken = mockRefreshTokens[0];

      await refreshTokenRepository.update(mockRefreshToken.id, {
        isRevoked: true,
      });

      const databaseRefreshTokens = await refreshTokenRepository.findAll();

      expect(databaseRefreshTokens).toEqual(
        expect.arrayContaining(
          mockRefreshTokens.map((refreshToken) =>
            refreshToken.id === mockRefreshToken.id
              ? {
                  ...refreshToken,
                  isRevoked: true,
                  updatedAt: expect.any(Date),
                }
              : refreshToken
          )
        )
      );
    });
  });

  describe("revokeSession", () => {
    it("should revoke all refresh tokens from session", async () => {
      const mockSession = mockSessions[0];

      await refreshTokenRepository.revokeSession(mockSession.id);

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
    });
  });
});
