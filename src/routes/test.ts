import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { TestSendMessageParams } from "../models/requests/test";
import { ServiceContainer } from "../service-provider";
import { jsonRequestHandler, sseRequestHandler } from "../utils/express";

export function createTestRoutes(serviceContainer: ServiceContainer) {
  const router = Router();

  router.get(
    "/data/users",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const testService = services.get("TestService");

      const response = await testService.getUsers(req.query);

      return response;
    })
  );

  router.post(
    "/data",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const testService = services.get("TestService");

      const response = await testService.createTestData(req.body);

      return response;
    })
  );

  router.post(
    "/data/chats",
    authMiddleware(serviceContainer),
    sseRequestHandler(
      serviceContainer,
      async (req, res, services, onSendEvent) => {
        const testService = services.get("TestService");

        await testService.testCreateChat(
          req.body,
          req.authContext,
          onSendEvent
        );
      }
    )
  );

  router.post(
    "/data/chats/:chatId/messages",
    authMiddleware(serviceContainer),
    sseRequestHandler(
      serviceContainer,
      async (req, res, services, onSendEvent) => {
        const testService = services.get("TestService");

        await testService.testSendMessage(
          req.params as TestSendMessageParams,
          req.body,
          onSendEvent
        );
      }
    )
  );

  router.delete(
    "/data",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const testService = services.get("TestService");

      const response = await testService.clearTestData();

      return response;
    })
  );

  return router;
}
