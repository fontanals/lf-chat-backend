import { ServerSentEvent } from "../../utils/types";
import { Chat } from "../entities/chat";

export type GetChatsResponse = { chats: Chat[]; totalChats: number };

export type GetChatResponse = { chat: Chat };

export type ChatServerSentEvent =
  | ServerSentEvent<"start", { messageId: string }>
  | ServerSentEvent<"delta", { messageId: string; delta: string }>
  | ServerSentEvent<"end", { messageId: string }>;

export type UpdateChatResponse = { chatId: string };

export type DeleteChatResponse = { chatId: string };
