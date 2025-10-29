import { Router } from "express";
import {
  DeleteChatParams,
  GetChatMessagesParams,
  GetChatParams,
  SendMessageParams,
  UpdateChatParams,
  UpdateMessageParams,
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
        req.authContext
      );

      return response;
    })
  );

  router.get(
    "/:chatId/messages",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      const response = await chatService.getChatMessages(
        req.params as GetChatMessagesParams,
        req.authContext
      );

      return response;
    })
  );

  router.post(
    "/",
    sseRequestHandler(
      serviceContainer,
      async (req, res, services, onSendEvent, abortSignal) => {
        const chatService = services.get("ChatService");

        await chatService.createChat(
          req.body,
          req.authContext,
          onSendEvent,
          abortSignal
        );
      }
    )
  );

  router.post(
    "/:chatId/messages",
    sseRequestHandler(
      serviceContainer,
      async (req, res, services, onSendEvent, abortSignal) => {
        const chatService = services.get("ChatService");

        await chatService.sendMessage(
          req.params as SendMessageParams,
          req.body,
          req.authContext,
          onSendEvent,
          abortSignal
        );
      }
    )
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

  router.patch(
    "/:chatId/messages/:messageId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const chatService = services.get("ChatService");

      const response = await chatService.updateMessage(
        req.params as UpdateMessageParams,
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
