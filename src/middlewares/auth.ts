import { RequestHandler } from "express";
import { IServiceProvider } from "../service-provider";
import {
  refreshTokenCookieName,
  refreshTokenCookieOptions,
} from "../utils/constants";
import { ApplicationError } from "../utils/errors";

export function authMiddleware(services: IServiceProvider): RequestHandler {
  return async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;
    const accessToken = authorizationHeader?.replace("Bearer ", "");
    const refreshToken = req.cookies?.refreshToken;

    try {
      if (accessToken == null && refreshToken == null) {
        throw ApplicationError.unauthorized();
      }

      const authService = services.get("AuthService");

      if (accessToken != null) {
        const result = authService.validateAccessToken(accessToken);

        if (result.isValid) {
          req.authContext = result.authContext;

          return next();
        }
      }

      const result = await authService.refreshToken(refreshToken);

      if (!result.isValid) {
        throw ApplicationError.unauthorized();
      }

      res
        .setHeader("Authorization", `Bearer ${result.accessToken}`)
        .cookie(
          refreshTokenCookieName,
          result.refreshToken,
          refreshTokenCookieOptions
        );

      req.authContext = result.authContext;

      next();
    } catch (error) {
      next(error);
    }
  };
}
