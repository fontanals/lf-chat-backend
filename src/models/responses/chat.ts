import { Paginated, ServerSentEvent } from "../../utils/types";
import { Chat } from "../entities/chat";
import { Message } from "../entities/message";

export type GetChatsResponse = { chats: Paginated<Chat> };

export type GetChatMessagesResponse = { messages: Message[] };

export type ChatServerSentEvent =
  | ServerSentEvent<"start", { messageId: string }>
  | ServerSentEvent<"delta", { messageId: string; delta: string }>
  | ServerSentEvent<"end", { messageId: string }>;

export type UpdateChatResponse = { chatId: string };

export type DeleteChatResponse = { chatId: string };
