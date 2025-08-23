import { randomUUID } from "crypto";
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
      const mockRefreshTokens: RefreshToken[] = [
        {
          id: randomUUID(),
          token: "token",
          expiresAt: new Date(),
          isRevoked: false,
          sessionId: randomUUID(),
        },
        {
          id: randomUUID(),
          token: "token",
          expiresAt: new Date(),
          isRevoked: false,
          sessionId: randomUUID(),
        },
      ];

      dataContext.query.mockResolvedValue({ rows: mockRefreshTokens });

      const refreshTokens = await refreshTokenRepository.findAll();

      expect(refreshTokens).toEqual(mockRefreshTokens);
    });
  });

  describe("findOne", () => {
    it("should return null when no refresh token is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const refreshToken = await refreshTokenRepository.findOne();

      expect(refreshToken).toBeNull();
    });

    it("should return refresh token", async () => {
      const mockRefreshToken: RefreshToken = {
        id: randomUUID(),
        token: "token",
        expiresAt: new Date(),
        isRevoked: false,
        sessionId: randomUUID(),
      };

      dataContext.query.mockResolvedValue({ rows: [mockRefreshToken] });

      const refreshToken = await refreshTokenRepository.findOne();

      expect(refreshToken).toEqual(mockRefreshToken);
    });
  });
});
