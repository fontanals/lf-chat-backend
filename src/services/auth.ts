import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import jsonwebtoken from "jsonwebtoken";
import z from "zod";
import { config } from "../config";
import { IDataContext } from "../data/data-context";
import { RefreshToken } from "../models/entities/refresh-token";
import { Session } from "../models/entities/session";
import { mapUserToDto } from "../models/entities/user";
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
    throw ApplicationError.gone();
  }

  async verifyAccount(
    request: VerifyAccountRequest
  ): Promise<VerifyAccountResponse> {
    throw ApplicationError.gone();
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
    throw ApplicationError.gone();
  }

  async resetPassword(
    request: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    throw ApplicationError.gone();
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
