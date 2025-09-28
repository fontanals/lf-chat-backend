import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import jsonwebtoken from "jsonwebtoken";
import z from "zod";
import { config } from "../config";
import { IDataContext } from "../data/context";
import { RefreshToken } from "../models/entities/refresh-token";
import { Session } from "../models/entities/session";
import { mapUserToDto, User, UserDto } from "../models/entities/user";
import { SigninRequest, SignupRequest } from "../models/requests/auth";
import {
  SigninReponse,
  SignoutResponse,
  SignupResponse,
} from "../models/responses/auth";
import { IRefreshTokenRepository } from "../repositories/refresh-token";
import { ISessionRepository } from "../repositories/session";
import { IUserRepository } from "../repositories/user";
import { ApplicationError } from "../utils/errors";
import { validateRequest } from "../utils/express";

export type AuthContext = { session: Session; user: UserDto };

declare global {
  namespace Express {
    interface Request {
      authContext: AuthContext;
    }
  }
}

type WithTokens<TResponse> = {
  accessToken: string;
  refreshToken: string;
  response: TResponse;
};

type ValidateAccessTokenResponse =
  | { isValid: true; authContext: AuthContext }
  | { isValid: false };

type RefreshTokenResponse =
  | {
      isValid: true;
      accessToken: string;
      refreshToken: string;
      authContext: AuthContext;
    }
  | { isValid: false };

export interface IAuthService {
  signup(request: SignupRequest): Promise<WithTokens<SignupResponse>>;
  signin(request: SigninRequest): Promise<WithTokens<SigninReponse>>;
  signout(authContext: AuthContext): Promise<SignoutResponse>;
  validateAccessToken(accessToken: string): ValidateAccessTokenResponse;
  refreshToken(refreshToken: string): Promise<RefreshTokenResponse>;
}

export class AuthService implements IAuthService {
  private readonly dataContext: IDataContext;
  private readonly userRepository: IUserRepository;
  private readonly sessionRepository: ISessionRepository;
  private readonly refreshTokenRepository: IRefreshTokenRepository;

  constructor(
    dataContext: IDataContext,
    userRepository: IUserRepository,
    sessionRepository: ISessionRepository,
    refreshTokenRepository: IRefreshTokenRepository
  ) {
    this.dataContext = dataContext;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.refreshTokenRepository = refreshTokenRepository;
  }

  async signup(request: SignupRequest): Promise<WithTokens<SignupResponse>> {
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
    });

    if (isInvalidEmail) {
      throw ApplicationError.invalidEmailOrPassword();
    }

    const hashedPassword = await bcrypt.hash(request.password, 10);

    const user: User = {
      id: randomUUID(),
      name: request.name,
      email: request.email,
      password: hashedPassword,
      displayName: request.name.split(" ")[0],
      customPrompt: null,
    };

    const session: Session = {
      id: randomUUID(),
      expiresAt: addDays(new Date(), 7),
      userId: user.id,
    };

    const userDto = mapUserToDto(user);

    const authContext: AuthContext = { session, user: userDto };

    const accessToken = this.generateAccessToken(authContext);
    const refreshToken = this.generateRefreshToken(authContext);

    const refreshTokenData: RefreshToken = {
      id: randomUUID(),
      token: refreshToken,
      sessionId: session.id,
      expiresAt: addDays(new Date(), 7),
      isRevoked: false,
    };

    try {
      await this.dataContext.begin();

      await this.userRepository.create(user);

      await this.sessionRepository.create(session);

      await this.refreshTokenRepository.create(refreshTokenData);

      await this.dataContext.commit();

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

  async signin(request: SigninRequest): Promise<WithTokens<SigninReponse>> {
    validateRequest(
      request,
      z.object({ email: z.email(), password: z.string() })
    );

    const user = await this.userRepository.findOne({ email: request.email });

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

    const userDto = mapUserToDto(user);

    const authContext: AuthContext = { session, user };

    const accessToken = this.generateAccessToken(authContext);
    const refreshToken = this.generateRefreshToken(authContext);

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

  validateAccessToken(accessToken: string): ValidateAccessTokenResponse {
    try {
      const authContext = jsonwebtoken.verify(
        accessToken,
        config.ACCESS_TOKEN_SECRET
      ) as AuthContext;

      return { isValid: true, authContext };
    } catch (error) {
      return { isValid: false };
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const refreshTokenData = await this.refreshTokenRepository.findOne({
        token: refreshToken,
      });

      if (refreshTokenData == null) {
        return { isValid: false };
      }

      if (refreshTokenData.isRevoked) {
        await this.refreshTokenRepository.revokeSession(
          refreshTokenData.sessionId
        );

        return { isValid: false };
      }

      if (refreshTokenData.expiresAt < new Date()) {
        await this.refreshTokenRepository.update(refreshTokenData.id, {
          isRevoked: true,
        });

        return { isValid: false };
      }

      const authContext = jsonwebtoken.verify(
        refreshToken,
        config.REFRESH_TOKEN_SECRET
      ) as AuthContext;

      await this.refreshTokenRepository.update(refreshTokenData.id, {
        isRevoked: true,
      });

      const newAccessToken = this.generateAccessToken({
        user: authContext.user,
        session: authContext.session,
      });

      const newRefreshToken = this.generateRefreshToken({
        user: authContext.user,
        session: authContext.session,
      });

      const newRefreshTokenData: RefreshToken = {
        id: randomUUID(),
        token: newRefreshToken,
        sessionId: authContext.session.id,
        expiresAt: addDays(new Date(), 7),
        isRevoked: false,
      };

      await this.refreshTokenRepository.create(newRefreshTokenData);

      return {
        isValid: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        authContext,
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  generateAccessToken(authContext: AuthContext) {
    return jsonwebtoken.sign(authContext, config.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m",
    });
  }

  generateRefreshToken(authContext: AuthContext) {
    return jsonwebtoken.sign(authContext, config.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });
  }
}
