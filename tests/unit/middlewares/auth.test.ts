import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import { config } from "../../../src/config";
import { authMiddleware } from "../../../src/middlewares/auth";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import { IServiceProvider } from "../../../src/service-provider";
import { AuthContext, IAuthService } from "../../../src/services/auth";
import { refreshTokenCookieName } from "../../../src/utils/constants";
import { ApplicationErrorCode } from "../../../src/utils/errors";

describe("authMiddleware", () => {
  let services: jest.Mocked<IServiceProvider>;
  let authService: jest.Mocked<IAuthService>;
  let request: jest.Mocked<Request>;
  let response: jest.Mocked<Response>;

  const user: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    createdAt: addDays(new Date(), -100),
    updatedAt: addDays(new Date(), -100),
  };

  const session: Session = {
    id: randomUUID(),
    expiresAt: addDays(user.createdAt!, 7),
    userId: user.id,
    createdAt: user.createdAt!,
  };

  const authContext: AuthContext = {
    session: {
      id: session.id,
      expiresAt: session.expiresAt.toISOString(),
      userId: user.id,
      createdAt: session.createdAt!.toISOString(),
    },
    user: { id: user.id, name: user.name, email: user.email },
  };

  beforeEach(() => {
    authService = {
      signup: jest.fn(),
      signin: jest.fn(),
      signout: jest.fn(),
      validateAccessToken: jest.fn(),
      refreshToken: jest.fn(),
    };

    services = { get: jest.fn().mockReturnValue(authService) };

    request = {} as unknown as jest.Mocked<Request>;

    response = {
      setHeader: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Response>;
  });

  it("should call next with unauthorized error when no access token and refresh token are provided", async () => {
    const middleware = authMiddleware(services);

    request.headers = {};
    request.cookies = {};

    const next = jest.fn();

    await middleware(request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ApplicationErrorCode.Unauthorized,
      })
    );
  });

  it("should set request auth context and call next when access token is valid", async () => {
    const middleware = authMiddleware(services);

    const accessToken = jsonwebtoken.sign(
      authContext,
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" }
    );

    authService.validateAccessToken.mockReturnValue({
      isValid: true,
      authContext,
    });

    request.headers = { authorization: `Bearer ${accessToken}` };
    request.cookies = {};

    const next = jest.fn();

    await middleware(request, response, next);

    expect(request.authContext).toEqual(authContext);
    expect(next).toHaveBeenCalled();
  });

  it("should call next with unauthorized error when no access token is provided and refresh token is invalid", async () => {
    const middleware = authMiddleware(services);

    request.headers = {};
    request.cookies = { refreshToken: "token" };

    authService.refreshToken.mockResolvedValue({ isValid: false });

    const next = jest.fn();

    await middleware(request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ApplicationErrorCode.Unauthorized,
      })
    );
  });

  it("should refresh token setting new access token header and refresh token cookie, set request auth context and call next function", async () => {
    const middleware = authMiddleware(services);

    const refreshToken = jsonwebtoken.sign(
      authContext,
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: "2d" }
    );

    request.headers = {};
    request.cookies = { refreshToken };

    const newAccessToken = jsonwebtoken.sign(
      authContext,
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jsonwebtoken.sign(
      authContext,
      config.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    authService.refreshToken.mockResolvedValue({
      isValid: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      authContext,
    });

    const next = jest.fn();

    await middleware(request, response, next);

    expect(response.setHeader).toHaveBeenCalledWith(
      "Authorization",
      `Bearer ${newAccessToken}`
    );
    expect(response.cookie).toHaveBeenCalledWith(
      refreshTokenCookieName,
      newRefreshToken,
      expect.any(Object)
    );
    expect(request.authContext).toEqual(authContext);
    expect(next).toHaveBeenCalled();
  });
});
