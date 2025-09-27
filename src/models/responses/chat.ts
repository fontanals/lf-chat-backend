import { ServerSentEvent } from "../../utils/types";
import { Chat } from "../entities/chat";
import { Message } from "../entities/message";

export type GetChatsResponse = { chats: Chat[]; totalChats: number };

export type GetChatResponse = Chat;

export type GetChatMessagesResponse = {
  latestPath: string[];
  rootMessageIds: string[];
  messages: Record<string, Message>;
};

export type ChatServerSentEvent =
  | ServerSentEvent<"start", { messageId: string }>
  | ServerSentEvent<"delta", { messageId: string; delta: string }>
  | ServerSentEvent<"end", { messageId: string }>;

export type UpdateChatResponse = string;

export type DeleteChatResponse = string;
