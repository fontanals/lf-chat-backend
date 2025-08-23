import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { IDataContext } from "../../../src/data/context";
import { User, UserDto } from "../../../src/models/entities/user";
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
        await authService.signup({ email: "email" } as any);

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
          name: "name",
          email: "email@example.com",
          password: "password",
        });

        fail("Expected to throw invaid email or password error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
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
        name: "name",
        email: "email@example.com",
        password: "password",
      };

      const result = await authService.signup(request);

      expect(result).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        response: {
          session: { id: expect.any(String), userId: expect.any(String) },
          user: {
            id: expect.any(String),
            name: request.name,
            email: request.email,
          },
        },
      });
    });
  });

  describe("signin", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await authService.signin({ email: "email" } as any);

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
          email: "email@example.com",
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
          id: randomUUID(),
          name: "name",
          email: "email@example.com",
          password: hashedPassword,
        };

        userRepository.findOne.mockResolvedValue(user);

        await authService.signin({
          email: user.email,
          password: "wrong password",
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
        id: randomUUID(),
        name: "name",
        email: "email@example.com",
        password: hashedPassword,
      };

      userRepository.findOne.mockResolvedValue(user);

      const result = await authService.signin({ email: user.email, password });

      expect(result).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        response: {
          session: { id: expect.any(String), userId: expect.any(String) },
          user: {
            id: expect.any(String),
            name: user.name,
            email: user.email,
          },
        },
      });
    });
  });

  describe("validateAccessToken", () => {
    it("should return invalid when access token is invalid", () => {
      const result = authService.validateAccessToken("invalid");

      expect(result.isValid).toBe(false);
    });

    it("should return valid with auth context when access token is valid", () => {
      const user: UserDto = { id: randomUUID(), name: "name", email: "email" };
      const session = { id: randomUUID(), userId: user.id };
      const authContext: AuthContext = { session, user };

      const accessToken = authService.generateAccessToken(authContext);

      const result = authService.validateAccessToken(accessToken);

      if (!result.isValid) {
        fail("Expected access token to be valid.");
      }

      expect(result).toEqual({
        isValid: true,
        authContext: expect.objectContaining({ session, user }),
      });
    });
  });

  describe("validateRefreshToken", () => {
    it("should return invalid when refresh token is not found", async () => {
      const user: UserDto = { id: randomUUID(), name: "name", email: "email" };
      const session = { id: randomUUID(), userId: user.id };
      const authContext: AuthContext = { session, user };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({ isValid: false });
    });

    it("should return invalid when refresh token is revoked", async () => {
      const user: UserDto = { id: randomUUID(), name: "name", email: "email" };
      const session = { id: randomUUID(), userId: user.id };
      const authContext: AuthContext = { session, user };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue({
        id: randomUUID(),
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), 2),
        isRevoked: true,
      });

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({ isValid: false });
    });

    it("should return invalid when refresh token is expired", async () => {
      const user: UserDto = { id: randomUUID(), name: "name", email: "email" };
      const session = { id: randomUUID(), userId: user.id };
      const authContext: AuthContext = { session, user };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue({
        id: randomUUID(),
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), -2),
        isRevoked: false,
      });

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({ isValid: false });
    });

    it("should return valid with new access and refresh tokens when refresh token is valid", async () => {
      const user: UserDto = { id: randomUUID(), name: "name", email: "email" };
      const session = { id: randomUUID(), userId: user.id };
      const authContext: AuthContext = { session, user };

      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue({
        id: randomUUID(),
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), 2),
        isRevoked: false,
      });

      const result = await authService.refreshToken(refreshToken);

      if (!result.isValid) {
        throw new Error("Expected refresh token to be valid.");
      }

      expect(result).toEqual({
        isValid: true,
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        authContext: expect.objectContaining({
          session: authContext.session,
          user: authContext.user,
        }),
      });
    });
  });
});
