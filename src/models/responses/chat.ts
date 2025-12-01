import { AssistantStatus } from "../../services/assistant";
import { CursorPagination, ServerSentEvent } from "../../utils/types";
import { ChatDto } from "../entities/chat";
import {
  Message,
  MessageEndPart,
  MessageStartPart,
  TextDeltaPart,
  TextEndPart,
  TextStartPart,
  ToolCallDeltaPart,
  ToolCallEndPart,
  ToolCallPart,
  ToolCallResultPart,
  ToolCallStartPart,
} from "../entities/message";

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

export type ToolCallEvent = ServerSentEvent<"tool-call", ToolCallPart>;

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
  | TextStartEvent
  | TextDeltaEvent
  | TextEndEvent
  | ToolCallStartEvent
  | ToolCallDeltaEvent
  | ToolCallEvent
  | ToolCallResultEvent
  | ToolCallEndEvent
  | MessageStartEvent
  | MessageEndEvent;

export type GetAssistantStatusResponse = AssistantStatus;

export type GetChatsResponse = CursorPagination<ChatDto, Date>;

export type GetChatResponse = ChatDto;

export type GetChatMessagesResponse = {
  latestPath: string[];
  rootMessageIds: string[];
  messages: Record<string, Message>;
};

export type UpdateChatResponse = string;

export type UpdateMessageResponse = string;

export type DeleteChatResponse = string;

export type DeleteAllChatsResponse = boolean;
