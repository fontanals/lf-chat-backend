import { Request, Response } from "express";
import {
  DeleteChatParams,
  GetChatMessagesParams,
  SendMessageParams,
  UpdateChatParams,
} from "../models/requests/chat";
import { IServiceProvider } from "../service-provider";

export async function getChats(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const chatService = services.get("ChatService");

  const response = await chatService.getChats(req.query, req.authContext);

  return response;
}

export async function getChatMessages(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const chatService = services.get("ChatService");

  const response = await chatService.getChatMessages(
    req.params as GetChatMessagesParams,
    req.authContext
  );

  return response;
}

export async function createChat(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const chatService = services.get("ChatService");

  await chatService.createChat(req.body, req.authContext, (event) =>
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  );
}

export async function sendMessage(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const chatService = services.get("ChatService");

  await chatService.sendMessage(
    req.params as SendMessageParams,
    req.body,
    req.authContext,
    (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)
  );
}

export async function updateChat(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const chatService = services.get("ChatService");

  const response = await chatService.updateChat(
    req.params as UpdateChatParams,
    req.body,
    req.authContext
  );

  return response;
}

export async function deleteChat(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const chatService = services.get("ChatService");

  const response = await chatService.deleteChat(
    req.params as DeleteChatParams,
    req.authContext
  );

  return response;
}
