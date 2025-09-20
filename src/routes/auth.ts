import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { ServiceContainer } from "../service-provider";
import {
  refreshTokenCookieName,
  refreshTokenCookieOptions,
} from "../utils/constants";
import { jsonRequestHandler } from "../utils/express";

export function createAuthRoutes(serviceContainer: ServiceContainer) {
  const router = Router();

  router.post(
    "/signup",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const authService = services.get("AuthService");

      const { accessToken, refreshToken, response } = await authService.signup(
        req.body
      );

      res
        .header("Authorization", `Bearer ${accessToken}`)
        .cookie(
          refreshTokenCookieName,
          refreshToken,
          refreshTokenCookieOptions
        );

      return response;
    })
  );

  router.post(
    "/signin",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const authService = services.get("AuthService");

      const { accessToken, refreshToken, response } = await authService.signin(
        req.body
      );

      res
        .header("Authorization", `Bearer ${accessToken}`)
        .cookie(
          refreshTokenCookieName,
          refreshToken,
          refreshTokenCookieOptions
        );

      return response;
    })
  );

  router.post(
    "/signout",
    authMiddleware(serviceContainer),
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const authService = services.get("AuthService");

      const response = await authService.signout(req.authContext);

      res.clearCookie(refreshTokenCookieName);

      return response;
    })
  );

  return router;
}
