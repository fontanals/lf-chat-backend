import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { IDataContext } from "../../../src/data/context";
import { mapUserToDto, User } from "../../../src/models/entities/user";
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

  const user: User = {
    id: randomUUID(),
    name: "user 1",
    email: "user1@example.com",
    password: "password",
    displayName: "user",
    customPreferences: null,
  };
  const userDto = mapUserToDto(user);
  const session = { id: randomUUID(), userId: userDto.id };
  const authContext: AuthContext = { session, user: userDto };

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
      update: jest.fn(),
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
        await authService.signup({ name: "new user" } as any);

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
          name: "new user",
          email: "new_user@example.com",
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

    it("should return user, session and the access tokens", async () => {
      const request: SignupRequest = {
        name: "new user",
        email: "new_user@example.com",
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
            displayName: request.name.split(" ")[0],
            customPreferences: null,
          },
        },
      });
    });
  });

  describe("signin", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await authService.signin({ name: "user 1" } as any);

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
          email: "non_existent@example.com",
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
        const hashedPassword = await bcrypt.hash(user.password, 10);

        userRepository.findOne.mockResolvedValue({
          ...user,
          password: hashedPassword,
        });

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

    it("should return user, session and the access tokens", async () => {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      userRepository.findOne.mockResolvedValue({
        ...user,
        password: hashedPassword,
      });

      const result = await authService.signin({
        email: user.email,
        password: user.password,
      });

      expect(result).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        response: {
          session: { id: expect.any(String), userId: user.id },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            displayName: user.displayName,
            customPreferences: null,
          },
        },
      });
    });
  });

  describe("signout", () => {
    it("should revoke all refresh tokens for the session", async () => {
      const response = await authService.signout(authContext);

      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(
        authContext.session.id
      );

      expect(response).toEqual({ userId: authContext.user.id });
    });
  });

  describe("validateAccessToken", () => {
    it("should return invalid when access token is invalid", () => {
      const result = authService.validateAccessToken("invalid");

      expect(result.isValid).toBe(false);
    });

    it("should return valid with auth context when access token is valid", () => {
      const accessToken = authService.generateAccessToken(authContext);

      const result = authService.validateAccessToken(accessToken);

      if (!result.isValid) {
        fail("Expected access token to be valid.");
      }

      expect(result).toEqual({
        isValid: true,
        authContext: expect.objectContaining({ session, user: userDto }),
      });
    });
  });

  describe("validateRefreshToken", () => {
    it("should return invalid when refresh token is not found", async () => {
      const refreshToken = authService.generateRefreshToken(authContext);

      refreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({ isValid: false });
    });

    it("should return invalid when refresh token is revoked", async () => {
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
