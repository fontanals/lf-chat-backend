import bcrypt from "bcrypt";
import { addDays } from "date-fns";
import { IDataContext } from "../../../src/data/context";
import { User } from "../../../src/models/entities/user";
import { SignupRequest } from "../../../src/models/requests/auth";
import { IRefreshTokenRepository } from "../../../src/repositories/refresh-token";
import { ISessionRepository } from "../../../src/repositories/session";
import { IUserRepository } from "../../../src/repositories/user";
import { AuthContext, AuthService } from "../../../src/services/auth";
import {
  ApplicationError,
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";

describe("AuthService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let userRepository: jest.Mocked<IUserRepository>;
  let sessionRepository: jest.Mocked<ISessionRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let authService: AuthService;

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    userRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    sessionRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    refreshTokenRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      revokeSession: jest.fn(),
    };

    authService = new AuthService(
      dataContext,
      userRepository,
      sessionRepository,
      refreshTokenRepository
    );
  });

  describe("signup", () => {
    it("should throw a bad request error when request does not match request schema", async () => {
      try {
        await authService.signup({ email: "john.doe@example.com" } as any);

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should throw an invalid email or password error when email is duplicate", async () => {
      try {
        userRepository.exists.mockResolvedValue(true);

        await authService.signup({
          name: "john doe",
          email: "john.doe@example.com",
          password: "password",
        });

        fail("Expected to throw invaid email or password error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.InvalidEmailOrPassword
        );
      }
    });

    it("should return a user, session and the access tokens", async () => {
      const request: SignupRequest = {
        name: "john doe",
        email: "john.doe@example.com",
        password: "password",
      };

      const result = await authService.signup(request);

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.response.session).toEqual({
        id: expect.any(String),
        userId: expect.any(String),
      });
      expect(result.response.user).toEqual({
        id: expect.any(String),
        name: request.name,
        email: request.email,
      });
    });
  });

  describe("signin", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await authService.signin({ email: "john.doe@example.com" } as any);

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should throw a invalid email or password error when email is not found", async () => {
      try {
        userRepository.exists.mockResolvedValue(false);

        await authService.signin({
          email: "john.doe@example.com",
          password: "password",
        });

        fail("Expected to throw invalid email or password error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.InvalidEmailOrPassword
        );
      }
    });

    it("should throw a invalid email or password error when password is incorrect", async () => {
      try {
        const hashedPassword = await bcrypt.hash("password", 10);

        const user: User = {
          id: "user-id",
          name: "john doe",
          email: "john.doe@example.com",
          password: hashedPassword,
        };

        userRepository.findOne.mockResolvedValue(user);

        await authService.signin({
          email: user.email,
          password: "wrong-password",
        });

        fail("Expected to throw invalid email or password error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.InvalidEmailOrPassword
        );
      }
    });

    it("should return a user, session and the access tokens", async () => {
      const password = "password";
      const hashedPassword = await bcrypt.hash(password, 10);
      const user: User = {
        id: "user-id",
        name: "john doe",
        email: "john.doe@example.com",
        password: hashedPassword,
      };

      userRepository.findOne.mockResolvedValue(user);

      const result = await authService.signin({ email: user.email, password });

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.response.session).toEqual({
        id: expect.any(String),
        userId: expect.any(String),
      });
      expect(result.response.user).toEqual({
        id: expect.any(String),
        name: user.name,
        email: user.email,
      });
    });
  });

  describe("validateAccessToken", () => {
    it("should return invalid when access token is invalid", () => {
      const accessToken = "invalid";

      const result = authService.validateAccessToken(accessToken);

      expect(result.isValid).toBe(false);
    });

    it("should return valid with auth context when access token is valid", () => {
      const authContext: AuthContext = {
        user: {
          id: "user-id",
          name: "john doe",
          email: "john.doe@example.com",
        },
        session: { id: "session-id", userId: "user-id" },
      };

      const accessToken = authService.generateAccessToken(authContext);

      const result = authService.validateAccessToken(accessToken);

      if (!result.isValid) {
        fail("Expected access token to be valid.");
      }

      expect(result.isValid).toBe(true);
      expect(result.authContext.user).toEqual(authContext.user);
      expect(result.authContext.session).toEqual(authContext.session);
    });
  });

  describe("validateRefreshToken", () => {
    it("should return invalid when refresh token is invalid", async () => {
      const refreshToken = "invalid";

      const result = await authService.refreshToken(refreshToken);

      expect(result.isValid).toBe(false);
    });

    it("should return invalid when refresh token data is not found", async () => {
      const authContext: AuthContext = {
        user: {
          id: "user-id",
          name: "john doe",
          email: "john.doe@example.com",
        },
        session: { id: "session-id", userId: "user-id" },
      };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await authService.refreshToken(refreshToken);

      expect(result.isValid).toBe(false);
    });

    it("should return invalid when refresh token is revoked", async () => {
      const authContext: AuthContext = {
        user: {
          id: "user-id",
          name: "john doe",
          email: "john.doe@example.com",
        },
        session: { id: "session-id", userId: "user-id" },
      };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue({
        id: "refresh-token-id",
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), 2),
        isRevoked: true,
      });

      const result = await authService.refreshToken(refreshToken);

      expect(result.isValid).toBe(false);
    });

    it("should return invalid when refresh token is expired", async () => {
      const authContext: AuthContext = {
        user: {
          id: "user-id",
          name: "john doe",
          email: "john.doe@example.com",
        },
        session: { id: "session-id", userId: "user-id" },
      };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue({
        id: "refresh-token-id",
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), -2),
        isRevoked: false,
      });

      const result = await authService.refreshToken(refreshToken);

      expect(result.isValid).toBe(false);
    });

    it("should return valid with new access and refresh tokens when refresh token is valid", async () => {
      const authContext: AuthContext = {
        user: {
          id: "user-id",
          name: "john doe",
          email: "john.doe@example.com",
        },
        session: { id: "session-id", userId: "user-id" },
      };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue({
        id: "refresh-token-id",
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), 2),
        isRevoked: false,
      });

      const result = await authService.refreshToken(refreshToken);

      if (!result.isValid) {
        throw new Error("Expected refresh token to be valid.");
      }

      expect(result.isValid).toBe(true);
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.authContext.user).toEqual(authContext.user);
      expect(result.authContext.session).toEqual(authContext.session);
    });
  });
});
