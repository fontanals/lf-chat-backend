import { CursorPagination, ServerSentEvent } from "../../utils/types";
import { Chat } from "../entities/chat";
import {
  Message,
  MessageEndPart,
  MessageStartPart,
  TextDeltaPart,
  TextEndPart,
  TextStartPart,
  ToolCallDeltaPart,
  ToolCallEndPart,
  ToolCallResultPart,
  ToolCallStartPart,
} from "../entities/message";

export type ProcessDocumentEvent = ServerSentEvent<
  "process-document",
  { success: true; id: string } | { success: false; id: string; error: string }
>;

export type TextStartEvent = ServerSentEvent<"text-start", TextStartPart>;

export type TextDeltaEvent = ServerSentEvent<"text-delta", TextDeltaPart>;

export type TextEndEvent = ServerSentEvent<"text-end", TextEndPart>;

export type ToolCallStartEvent = ServerSentEvent<
  "tool-call-start",
  ToolCallStartPart
>;

export type ToolCallDeltaEvent = ServerSentEvent<
  "tool-call-delta",
  ToolCallDeltaPart
>;

export type ToolCallResultEvent = ServerSentEvent<
  "tool-call-result",
  ToolCallResultPart
>;

export type ToolCallEndEvent = ServerSentEvent<
  "tool-call-end",
  ToolCallEndPart
>;

export type MessageStartEvent = ServerSentEvent<
  "message-start",
  MessageStartPart
>;

export type MessageEndEvent = ServerSentEvent<"message-end", MessageEndPart>;

export type SendMessageEvent =
  | ProcessDocumentEvent
  | TextStartEvent
  | TextDeltaEvent
  | TextEndEvent
  | ToolCallStartEvent
  | ToolCallDeltaEvent
  | ToolCallResultEvent
  | ToolCallEndEvent
  | MessageStartEvent
  | MessageEndEvent;

export type GetChatsResponse = CursorPagination<Chat, string>;

export type GetChatResponse = Chat;

export type GetChatMessagesResponse = {
  latestPath: string[];
  rootMessageIds: string[];
  messages: Record<string, Message>;
};

export type UpdateChatResponse = string;

export type UpdateMessageResponse = string;

export type DeleteChatResponse = string;
