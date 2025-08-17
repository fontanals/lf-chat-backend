import { IDataContext } from "../../../src/data/context";
import { RefreshToken } from "../../../src/models/entities/refresh-token";
import { RefreshTokenRepository } from "../../../src/repositories/refresh-token";

describe("RefreshTokenRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let refreshTokenRepository: RefreshTokenRepository;

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    refreshTokenRepository = new RefreshTokenRepository(dataContext);
  });

  describe("findAll", () => {
    it("should return an empty array when no refresh tokens are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const result = await refreshTokenRepository.findAll();

      expect(result).toEqual([]);
    });

    it("should return refresh tokens", async () => {
      const refreshTokens: RefreshToken[] = [
        {
          id: "refresh-token-1",
          token: "refresh-token-1",
          expiresAt: new Date(),
          isRevoked: false,
          sessionId: "session-id",
          createdAt: new Date(),
        },
        {
          id: "refresh-token-2",
          token: "refresh-token-2",
          expiresAt: new Date(),
          isRevoked: false,
          sessionId: "session-id",
          createdAt: new Date(),
        },
        {
          id: "refresh-token-3",
          token: "refresh-token-3",
          expiresAt: new Date(),
          isRevoked: false,
          sessionId: "session-id",
          createdAt: new Date(),
        },
      ];

      dataContext.query.mockResolvedValue({ rows: refreshTokens });

      const result = await refreshTokenRepository.findAll();

      expect(result).toEqual(refreshTokens);
    });
  });

  describe("findOne", () => {
    it("should return null when no refresh token is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const result = await refreshTokenRepository.findOne();

      expect(result).toBeNull();
    });

    it("should return refresh token", async () => {
      const refreshToken: RefreshToken = {
        id: "refresh-token-id",
        token: "refresh-token",
        expiresAt: new Date(),
        sessionId: "session-id",
        createdAt: new Date(),
      };

      dataContext.query.mockResolvedValue({ rows: [refreshToken] });

      const result = await refreshTokenRepository.findOne();

      expect(result).toEqual(refreshToken);
    });
  });
});
