import { Router } from "express";
import { ServiceContainer } from "../service-provider";
import { refreshTokenCookieName } from "../utils/constants";
import { jsonRequestHandler } from "../utils/express";

export function createUserRoutes(serviceContainer: ServiceContainer) {
  const router = Router();

  router.get(
    "/",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const userService = services.get("UserService");

      const response = await userService.getUser(req.authContext);

      return response;
    })
  );

  router.patch(
    "/",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const userService = services.get("UserService");

      const response = await userService.updateUser(req.body, req.authContext);

      return response;
    })
  );

  router.patch(
    "/password",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const userService = services.get("UserService");

      const response = await userService.changePassword(
        req.body,
        req.authContext
      );

      return response;
    })
  );

  router.delete(
    "/",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const userService = services.get("UserService");

      const response = await userService.deleteUser(req.authContext);

      res.clearCookie(refreshTokenCookieName);

      return response;
    })
  );

  return router;
}
