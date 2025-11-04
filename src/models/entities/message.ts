export type MessageFinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other"
  | "unknown"
  | "interrupted";

export type ToolName = "processDocument" | "searchDocument";

export type ToolResult<TData> =
  | { success: true; data: TData }
  | { success: false; error: string };

export type ProcessDocumentToolInput = { id: string; name: string };

export type ProcessDocumentToolOutput = ToolResult<string>;

export type SearchDocumentToolInput = {
  id: string;
  name: string;
  query: string;
};

export type SearchDocumentToolOutput = ToolResult<string>;

export type TextStartPart = {
  type: "text-start";
  id: string;
  messageId: string;
};

export type TextDeltaPart = {
  type: "text-delta";
  id: string;
  delta: string;
  messageId: string;
};

export type TextEndPart = { type: "text-end"; id: string; messageId: string };

export type ToolCallStartPart = {
  type: "tool-call-start";
  id: string;
  name: ToolName;
  messageId: string;
};

export type ToolCallDeltaPart = {
  type: "tool-call-delta";
  id: string;
  name: ToolName;
  delta: string;
  messageId: string;
};

export type ProcessDocumentToolCallPart = {
  type: "tool-call";
  id: string;
  name: "processDocument";
  input: ProcessDocumentToolInput;
  messageId: string;
};

export type SearchDocumentToolCallPart = {
  type: "tool-call";
  id: string;
  name: "searchDocument";
  input: SearchDocumentToolInput;
  messageId: string;
};

export type ToolCallPart =
  | ProcessDocumentToolCallPart
  | SearchDocumentToolCallPart;

export type ProcessDocumentToolCallResultPart = {
  type: "tool-call-result";
  id: string;
  name: "processDocument";
  input: ProcessDocumentToolInput;
  output: ProcessDocumentToolOutput;
  messageId: string;
};

export type SearchDocumentToolCallResultPart = {
  type: "tool-call-result";
  id: string;
  name: "searchDocument";
  input: SearchDocumentToolInput;
  output: SearchDocumentToolOutput;
  messageId: string;
};

export type ToolCallResultPart =
  | ProcessDocumentToolCallResultPart
  | SearchDocumentToolCallResultPart;

export type ToolCallEndPart = {
  type: "tool-call-end";
  id: string;
  name: ToolName;
  messageId: string;
};

export type MessageStartPart = { type: "message-start"; messageId: string };

export type MessageEndPart =
  | {
      type: "message-end";
      finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "other"
        | "unknown"
        | "interrupted";
      messageId: string;
    }
  | {
      type: "message-end";
      finishReason: "error";
      error: string;
      messageId: string;
    };

export type MessagePart =
  | TextStartPart
  | TextDeltaPart
  | TextEndPart
  | ToolCallStartPart
  | ToolCallDeltaPart
  | ToolCallPart
  | ToolCallResultPart
  | ToolCallEndPart
  | MessageStartPart
  | MessageEndPart;

export type TextContentBlock = { type: "text"; id: string; text: string };

export type DocumentContentBlock = {
  type: "document";
  id: string;
  name: string;
};

export type ProcessDocumentToolCallContentBlock = {
  type: "tool-call";
  id: string;
  name: "processDocument";
  input: ProcessDocumentToolInput;
  output: ProcessDocumentToolOutput;
};

export type SearchDocumentToolCallContentBlock = {
  type: "tool-call";
  id: string;
  name: "searchDocument";
  input: SearchDocumentToolInput;
  output: SearchDocumentToolOutput;
};

export type ToolCallContentBlock =
  | ProcessDocumentToolCallContentBlock
  | SearchDocumentToolCallContentBlock;

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
