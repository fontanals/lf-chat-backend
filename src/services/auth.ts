import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import jsonwebtoken from "jsonwebtoken";
import z from "zod";
import { config } from "../config";
import { IDataContext } from "../data/data-context";
import { RefreshToken } from "../models/entities/refresh-token";
import { Session } from "../models/entities/session";
import { mapUserToDto, User } from "../models/entities/user";
import {
  RecoverPasswordRequest,
  ResetPasswordRequest,
  SigninRequest,
  SignupRequest,
  VerifyAccountRequest,
} from "../models/requests/auth";
import {
  RecoverPasswordResponse,
  ResetPasswordResponse,
  SigninResponse,
  SignoutResponse,
  SignupResponse,
  VerifyAccountResponse,
} from "../models/responses/auth";
import { IRefreshTokenRepository } from "../repositories/refresh-token";
import { ISessionRepository } from "../repositories/session";
import { IUserRepository } from "../repositories/user";
import {
  accountVerificationEmail,
  passwordRecoveryEmail,
} from "../utils/emails";
import { ApplicationError } from "../utils/errors";
import { validateRequest } from "../utils/express";
import { IEmailService } from "./email";
import { ILogger } from "./logger";

export type AuthContext = {
  session: {
    id: string;
    expiresAt: string;
    userId: string;
    createdAt?: string;
  };
  user: { id: string; name: string; email: string };
};

declare global {
  namespace Express {
    interface Request {
      authContext: AuthContext;
    }
  }
}

type ValidateTokenResult<TPayload> =
  | { isValid: true; payload: TPayload }
  | { isValid: false };

type RefreshTokenResult = {
  accessToken: string;
  refreshToken: string;
  authContext: AuthContext;
};

export interface IAuthService {
  signup(request: SignupRequest): Promise<SignupResponse>;
  verifyAccount(request: VerifyAccountRequest): Promise<VerifyAccountResponse>;
  signin(request: SigninRequest): Promise<{
    accessToken: string;
    refreshToken: string;
    response: SigninResponse;
  }>;
  signout(authContext: AuthContext): Promise<SignoutResponse>;
  recoverPassword(
    request: RecoverPasswordRequest
  ): Promise<RecoverPasswordResponse>;
  resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse>;
  validateAccessToken(accessToken: string): ValidateTokenResult<AuthContext>;
  refreshToken(refreshToken: string): Promise<RefreshTokenResult>;
}

export class AuthService implements IAuthService {
  private readonly dataContext: IDataContext;
  private readonly userRepository: IUserRepository;
  private readonly sessionRepository: ISessionRepository;
  private readonly refreshTokenRepository: IRefreshTokenRepository;
  private readonly emailService: IEmailService;
  private readonly logger: ILogger;

  constructor(
    dataContext: IDataContext,
    userRepository: IUserRepository,
    sessionRepository: ISessionRepository,
    refreshTokenRepository: IRefreshTokenRepository,
    emailService: IEmailService,
    logger: ILogger
  ) {
    this.dataContext = dataContext;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.emailService = emailService;
    this.logger = logger;
  }

  async signup(request: SignupRequest): Promise<SignupResponse> {
    validateRequest(
      request,
      z.object({
        name: z.string(),
        email: z.email(),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters long."),
      })
    );

    const isInvalidEmail = await this.userRepository.exists({
      email: request.email,
      isVerified: true,
    });

    if (isInvalidEmail) {
      throw ApplicationError.invalidEmailOrPassword();
    }

    const hashedPassword = await bcrypt.hash(request.password, 10);

    const accountVerificationCode = jsonwebtoken.sign(
      { email: request.email },
      config.ACCOUNT_VERIFICATION_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const user: User = {
      id: randomUUID(),
      name: request.name,
      email: request.email,
      password: hashedPassword,
      displayName: request.name.split(" ")[0],
      customPrompt: null,
      verificationToken: accountVerificationCode,
      recoveryToken: null,
      isVerified: false,
    };

    await this.userRepository.create(user);

    if (config.NODE_ENV !== "test") {
      this.emailService
        .sendEmail({
          from: config.SUPPORT_EMAIL,
          to: user.email,
          subject: "LF Chat Account Verification",
          content: accountVerificationEmail(user.name),
        })
        .catch((error) => {
          this.logger.error(
            "Error sending account verification email: ",
            error
          );
        });
    }

    return user.email;
  }

  async verifyAccount(
    request: VerifyAccountRequest
  ): Promise<VerifyAccountResponse> {
    validateRequest(request, z.object({ token: z.string() }));

    const validateTokenResult = this.validateToken<{ email: string }>(
      request.token,
      config.ACCOUNT_VERIFICATION_TOKEN_SECRET
    );

    if (!validateTokenResult.isValid) {
      throw ApplicationError.invalidAccountVerificationToken();
    }

    const user = await this.userRepository.findOne({
      email: validateTokenResult.payload.email,
      verificationToken: request.token,
      isVerified: false,
    });

    if (user == null) {
      throw ApplicationError.invalidAccountVerificationToken();
    }

    await this.userRepository.update(user.id, {
      verificationToken: null,
      isVerified: true,
    });

    return user.email;
  }

  async signin(request: SigninRequest): Promise<{
    accessToken: string;
    refreshToken: string;
    response: SigninResponse;
  }> {
    validateRequest(
      request,
      z.object({ email: z.email(), password: z.string() })
    );

    const user = await this.userRepository.findOne({
      email: request.email,
      isVerified: true,
    });

    if (user == null) {
      throw ApplicationError.invalidEmailOrPassword();
    }

    const isPasswordValid = await bcrypt.compare(
      request.password,
      user.password
    );

    if (!isPasswordValid) {
      throw ApplicationError.invalidEmailOrPassword();
    }

    const session: Session = {
      id: randomUUID(),
      expiresAt: addDays(new Date(), 7),
      userId: user.id,
    };

    const authContext: AuthContext = {
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
        userId: session.userId,
      },
      user: { id: user.id, name: user.name, email: user.email },
    };

    const accessToken = jsonwebtoken.sign(
      authContext,
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jsonwebtoken.sign(
      authContext,
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    const refreshTokenData: RefreshToken = {
      id: randomUUID(),
      token: refreshToken,
      sessionId: session.id,
      expiresAt: addDays(new Date(), 7),
      isRevoked: false,
    };

    try {
      await this.dataContext.begin();

      await this.sessionRepository.create(session);

      await this.refreshTokenRepository.create(refreshTokenData);

      await this.dataContext.commit();

      const userDto = mapUserToDto(user);

      return {
        accessToken,
        refreshToken,
        response: { session, user: userDto },
      };
    } catch (error) {
      await this.dataContext.rollback();

      throw error;
    }
  }

  async signout(authContext: AuthContext): Promise<SignoutResponse> {
    await this.refreshTokenRepository.revokeSession(authContext.session.id);

    return authContext.user.id;
  }

  async recoverPassword(
    request: RecoverPasswordRequest
  ): Promise<RecoverPasswordResponse> {
    validateRequest(request, z.object({ email: z.email() }));

    const user = await this.userRepository.findOne({
      email: request.email,
      isVerified: true,
    });

    if (user == null) {
      throw ApplicationError.badRequest();
    }

    const recoveryToken = jsonwebtoken.sign(
      { email: user.email },
      config.PASSWORD_RECOVERY_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    await this.userRepository.update(user.id, { recoveryToken });

    if (config.NODE_ENV !== "test") {
      this.emailService
        .sendEmail({
          from: config.SUPPORT_EMAIL,
          to: user.email,
          subject: "LF Chat Password Recovery",
          content: passwordRecoveryEmail(user.name),
        })
        .catch((error) => {
          this.logger.error("Error sending password recovery email: ", error);
        });
    }

    return user.email;
  }

  async resetPassword(
    request: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    validateRequest(
      request,
      z.object({
        token: z.string(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters long."),
      })
    );

    const validateTokenResult = this.validateToken<{ email: string }>(
      request.token,
      config.PASSWORD_RECOVERY_TOKEN_SECRET
    );

    if (!validateTokenResult.isValid) {
      throw ApplicationError.invalidPasswordRecoveryToken();
    }

    const user = await this.userRepository.findOne({
      email: validateTokenResult.payload.email,
      recoveryToken: request.token,
    });

    if (user == null) {
      throw ApplicationError.invalidPasswordRecoveryToken();
    }

    const hashedPassword = await bcrypt.hash(request.newPassword, 10);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
      recoveryToken: null,
    });

    return user.email;
  }

  validateAccessToken(accessToken: string): ValidateTokenResult<AuthContext> {
    const result = this.validateToken<AuthContext>(
      accessToken,
      config.ACCESS_TOKEN_SECRET
    );

    return result;
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    const refreshTokenData = await this.refreshTokenRepository.findOne({
      token: refreshToken,
    });

    if (refreshTokenData == null) {
      throw ApplicationError.unauthorized();
    }

    if (refreshTokenData.isRevoked) {
      await this.refreshTokenRepository.revokeSession(
        refreshTokenData.sessionId
      );

      throw ApplicationError.unauthorized();
    }

    if (refreshTokenData.expiresAt < new Date()) {
      await this.refreshTokenRepository.update(refreshTokenData.id, {
        isRevoked: true,
      });

      throw ApplicationError.sessionExpired();
    }

    const authContext = jsonwebtoken.verify(
      refreshToken,
      config.REFRESH_TOKEN_SECRET
    ) as AuthContext;

    await this.refreshTokenRepository.update(refreshTokenData.id, {
      isRevoked: true,
    });

    const newAccessToken = jsonwebtoken.sign(
      { session: authContext.session, user: authContext.user },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jsonwebtoken.sign(
      {
        session: authContext.session,
        user: authContext.user,
        exp: new Date(authContext.session.expiresAt).getTime() / 1000,
      },
      config.REFRESH_TOKEN_SECRET
    );

    const newRefreshTokenData: RefreshToken = {
      id: randomUUID(),
      token: newRefreshToken,
      isRevoked: false,
      expiresAt: new Date(authContext.session.expiresAt),
      sessionId: authContext.session.id,
    };

    await this.refreshTokenRepository.create(newRefreshTokenData);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      authContext,
    };
  }

  private validateToken<TPayload>(
    token: string,
    secret: string
  ): ValidateTokenResult<TPayload> {
    try {
      const payload = jsonwebtoken.verify(token, secret) as TPayload;

      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false };
    }
  }
}
