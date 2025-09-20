import { Router } from "express";
import {
  DeleteChatParams,
  GetChatParams,
  SendMessageParams,
  UpdateChatParams,
} from "../models/requests/chat";
import { ServiceContainer } from "../service-provider";
import { jsonRequestHandler, sseRequestHandler } from "../utils/express";

export function createChatRoutes(serviceContainer: ServiceContainer) {
  const router = Router();

  router.get(
    "/",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      const response = await chatService.getChats(req.query, req.authContext);

      return response;
    })
  );

  router.get(
    "/:chatId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      const response = await chatService.getChat(
        req.params as GetChatParams,
        req.query,
        req.authContext
      );

      return response;
    })
  );

  router.post(
    "/",
    sseRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      await chatService.createChat(req.body, req.authContext, (event) =>
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      );
    })
  );

  router.post(
    "/:chatId/messages",
    sseRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      await chatService.sendMessage(
        req.params as SendMessageParams,
        req.body,
        req.authContext,
        (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)
      );
    })
  );

  router.patch(
    "/:chatId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      const response = await chatService.updateChat(
        req.params as UpdateChatParams,
        req.body,
        req.authContext
      );

      return response;
    })
  );

  router.delete(
    "/:chatId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      const response = await chatService.deleteChat(
        req.params as DeleteChatParams,
        req.authContext
      );

      return response;
    })
  );

  return router;
}
