import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import { authMiddleware } from "../middlewares/auth";
import { ServiceContainer } from "../service-provider";
import {
  refreshTokenCookieName,
  refreshTokenCookieOptions,
} from "../utils/constants";
import { jsonRequestHandler } from "../utils/express";

export function createAuthRoutes(serviceContainer: ServiceContainer) {
  const router = Router();

  if (config.ENABLE_RATE_LIMITING) {
    router.post(
      "/signup",
      rateLimit({
        windowMs: config.SIGNUP_RATE_LIMIT_WINDOW_IN_MINUTES * 60 * 1000,
        max: config.SIGNUP_RATE_LIMIT_MAX_REQUESTS,
        message: "Too many accounts created. Please try again later.",
      }),
      jsonRequestHandler(serviceContainer, async (req, res, services) => {
        const authService = services.get("AuthService");

        const { accessToken, refreshToken, response } =
          await authService.signup(req.body);

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
  } else {
    router.post(
      "/signup",
      jsonRequestHandler(serviceContainer, async (req, res, services) => {
        const authService = services.get("AuthService");

        const { accessToken, refreshToken, response } =
          await authService.signup(req.body);

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
  }

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

  router.post(
    "/delete-account",
    authMiddleware(serviceContainer),
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const authService = services.get("AuthService");

      const response = await authService.deleteAccount(req.authContext);

      res.clearCookie(refreshTokenCookieName);

      return response;
    })
  );

  return router;
}
