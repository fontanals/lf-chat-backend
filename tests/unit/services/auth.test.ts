import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../src/config";
import { IDataContext } from "../../../src/data/data-context";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import {
  RecoverPasswordRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyAccountRequest,
} from "../../../src/models/requests/auth";
import { IRefreshTokenRepository } from "../../../src/repositories/refresh-token";
import { ISessionRepository } from "../../../src/repositories/session";
import { IUserRepository } from "../../../src/repositories/user";
import { AuthContext, AuthService } from "../../../src/services/auth";
import { IEmailService } from "../../../src/services/email";
import { ILogger } from "../../../src/services/logger";
import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";

describe("AuthService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let userRepository: jest.Mocked<IUserRepository>;
  let sessionRepository: jest.Mocked<ISessionRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let logger: jest.Mocked<ILogger>;
  let authService: AuthService;

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Session = {
    id: randomUUID(),
    userId: mockUser.id,
    expiresAt: addDays(new Date(), 7),
    createdAt: new Date(),
  };

  const authContext: AuthContext = {
    session: {
      id: mockSession.id,
      expiresAt: mockSession.expiresAt.toISOString(),
      userId: mockSession.userId,
      createdAt: mockSession.createdAt!.toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

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
      delete: jest.fn(),
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

    emailService = { sendEmail: jest.fn(), close: jest.fn() };

    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    authService = new AuthService(
      dataContext,
      userRepository,
      sessionRepository,
      refreshTokenRepository,
      emailService,
      logger
    );
  });

  describe("signup", () => {
    it("should throw a resource gone error", async () => {
      try {
        const request: SignupRequest = {
          name: "New User",
          email: "new.user@example.com",
          password: "password",
        };

        await authService.signup(request);

        fail("Expected to throw resource gone error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.Gone
        );
      }
    });
  });

  describe("verifyAccount", () => {
    it("should throw a resource gone error", async () => {
      try {
        const verificationToken = jsonwebtoken.sign(
          { email: "new.user@example.com" },
          config.ACCOUNT_VERIFICATION_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        userRepository.findOne.mockResolvedValue({
          id: randomUUID(),
          name: "New User",
          email: "new.user@example.com",
          password: "password",
          displayName: "New User",
          customPrompt: null,
          verificationToken,
          recoveryToken: null,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request: VerifyAccountRequest = { token: verificationToken };

        await authService.verifyAccount(request);

        fail("Expected to throw resource gone error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.Gone
        );
      }
    });
  });

  describe("signin", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await authService.signin({ name: "user 1" } as any);

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
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
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.InvalidEmailOrPassword
        );
      }
    });

    it("should throw a invalid email or password error when password is incorrect", async () => {
      try {
        const hashedPassword = await bcrypt.hash(mockUser.password, 10);

        userRepository.findOne.mockResolvedValue({
          ...mockUser,
          password: hashedPassword,
        });

        await authService.signin({
          email: mockUser.email,
          password: "wrong password",
        });

        fail("Expected to throw invalid email or password error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.InvalidEmailOrPassword
        );
      }
    });

    it("should return user, session and the access tokens", async () => {
      const hashedPassword = await bcrypt.hash(mockUser.password, 10);

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await authService.signin({
        email: mockUser.email,
        password: mockUser.password,
      });

      expect(result).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        response: {
          session: {
            id: expect.any(String),
            expiresAt: expect.any(Date),
            userId: mockUser.id,
          },
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            displayName: mockUser.displayName,
            customPrompt: null,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
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

      expect(response).toEqual(authContext.user.id);
    });
  });

  describe("recoverPassword", () => {
    it("should throw a resource gone error", async () => {
      try {
        userRepository.findOne.mockResolvedValue({
          id: randomUUID(),
          name: "User 1",
          email: "user1@example.com",
          password: "password",
          displayName: "User 1",
          customPrompt: null,
          verificationToken: null,
          recoveryToken: null,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request: RecoverPasswordRequest = { email: "user1@example.com" };

        await authService.recoverPassword(request);

        fail("Expected to throw resource gone error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.Gone
        );
      }
    });
  });

  describe("resetPassword", () => {
    it("should throw a resource gone error", async () => {
      try {
        const recoveryToken = jsonwebtoken.sign(
          { email: "user1@example.com" },
          config.PASSWORD_RECOVERY_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        userRepository.findOne.mockResolvedValue({
          id: randomUUID(),
          name: "User 1",
          email: "user1@example.com",
          password: "password",
          displayName: "User 1",
          customPrompt: null,
          verificationToken: null,
          recoveryToken,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request: ResetPasswordRequest = {
          token: recoveryToken,
          newPassword: "new-password",
        };

        await authService.resetPassword(request);

        fail("Expected to throw resource gone error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.Gone
        );
      }
    });
  });

  describe("validateAccessToken", () => {
    it("should return invalid when access token is invalid", () => {
      const result = authService.validateAccessToken("invalid");

      expect(result.isValid).toBe(false);
    });

    it("should return valid with auth context when access token is valid", () => {
      const accessToken = jsonwebtoken.sign(
        authContext,
        config.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const result = authService.validateAccessToken(accessToken);

      if (!result.isValid) {
        fail("Expected access token to be valid.");
      }

      expect(result).toEqual({
        isValid: true,
        payload: expect.objectContaining({
          session: authContext.session,
          user: authContext.user,
        }),
      });
    });
  });

  describe("refreshToken", () => {
    it("should throw an unauthorized error when refresh token does not exist", async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      try {
        await authService.refreshToken("token");

        fail("Expected to throw unauthorized error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.Unauthorized
        );
      }
    });

    it("should throw an unauthorized error when refresh token is revoked", async () => {
      const refreshToken = "token";

      refreshTokenRepository.findOne.mockResolvedValue({
        id: randomUUID(),
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), 2),
        isRevoked: true,
      });

      try {
        await authService.refreshToken(refreshToken);

        fail("Expected to throw unauthorized error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.Unauthorized
        );
      }
    });

    it("should throw a session expired error when refresh token is expired", async () => {
      const refreshToken = "token";

      refreshTokenRepository.findOne.mockResolvedValue({
        id: randomUUID(),
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), -2),
        isRevoked: false,
      });

      try {
        await authService.refreshToken(refreshToken);

        fail("Expected to throw session expired error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.SessionExpired
        );
      }
    });

    it("should return new access and refresh tokens when refresh token is valid", async () => {
      const refreshToken = jsonwebtoken.sign(
        authContext,
        config.REFRESH_TOKEN_SECRET,
        { expiresIn: "2d" }
      );

      refreshTokenRepository.findOne.mockResolvedValue({
        id: randomUUID(),
        token: refreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), 2),
        isRevoked: false,
      });

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({
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
