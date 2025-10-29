export type ToolName = "search-documents";

export type ToolResult<TData> =
  | { success: true; data: TData }
  | { success: false; error: string };

export type SearchDocumentsToolInput = { query: string };

export type SearchDocumentsToolOutput = ToolResult<string>;

export type MessageFinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other"
  | "unknown"
  | "interrupted";

export type TextStartPart = { type: "text-start"; messageId: string };

export type TextDeltaPart = {
  type: "text-delta";
  messageId: string;
  delta: string;
};

export type TextEndPart = { type: "text-end"; messageId: string };

export type ToolCallStartPart = {
  type: "tool-call-start";
  messageId: string;
  id: string;
  name: ToolName;
};

export type ToolCallDeltaPart = {
  type: "tool-call-start";
  messageId: string;
  id: string;
  name: string;
  delta: string;
};

export type SearchDocumentsToolCallResultPart = {
  type: "tool-call-result";
  messageId: string;
  id: string;
  name: "search-documents";
  input: SearchDocumentsToolInput;
  output: SearchDocumentsToolOutput;
};

export type ToolCallResultPart = SearchDocumentsToolCallResultPart;

export type ToolCallEndPart = {
  type: "tool-call-end";
  messageId: string;
  id: string;
  name: ToolName;
};

export type MessageStartPart = { type: "message-start"; messageId: string };

export type MessageEndPart =
  | {
      type: "message-end";
      messageId: string;
      finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "other"
        | "unknown"
        | "interrupted";
    }
  | {
      type: "messageEnd";
      messageId: string;
      finishReason: "error";
      error: string;
    };

export type MessagePart =
  | TextStartPart
  | TextDeltaPart
  | TextEndPart
  | ToolCallStartPart
  | ToolCallDeltaPart
  | ToolCallResultPart
  | ToolCallEndPart
  | MessageStartPart
  | MessageEndPart;

export type TextContentBlock = { type: "text"; text: string };

export type DocumentContentBlock = {
  type: "document";
  id: string;
  name: string;
  mimetype: string;
};

export type SearchDocumentsToolCallContentBlock = {
  type: "tool-call";
  id: string;
  name: "search-documents";
  input: SearchDocumentsToolInput;
  output: SearchDocumentsToolOutput;
};

export type ToolCallContentBlock = SearchDocumentsToolCallContentBlock;

export type UserContentBlock = TextContentBlock | DocumentContentBlock;

export type AssistantContentBlock = TextContentBlock | ToolCallContentBlock;

export type MessageFeedback = "like" | "dislike" | "neutral";

export type UserMessage = {
  id: string;
  role: "user";
  content: UserContentBlock[];
  parentMessageId?: string | null;
  chatId: string;
  createdAt?: Date;
  updatedAt?: Date;
  childrenMessageIds?: string[];
};

export type AssistantMessage = {
  id: string;
  role: "assistant";
  content: AssistantContentBlock[];
  feedback?: MessageFeedback | null;
  finishReason: MessageFinishReason;
  parentMessageId?: string | null;
  chatId: string;
  createdAt?: Date;
  updatedAt?: Date;
  childrenMessageIds?: string[];
};

export type Message = UserMessage | AssistantMessage;
