import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const SuccessToolResultSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      enum: [true],
      description: "Indicates the result was successful (always true)",
      example: true,
    },
    data: { type: "object", description: "The data returned by the tool" },
  },
  required: ["success", "data"],
};

const ErrorToolResultSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      enum: [false],
      description: "Indicates the result was successful (always false)",
      example: false,
    },
    error: {
      type: "string",
      description: "The error message",
      example: "An error occurred while processing the tool.",
    },
  },
  required: ["success", "error"],
};

const ProcessDocumentToolInputSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Document ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      description: "Document name",
      example: "notes.txt",
    },
  },
  required: ["id", "name"],
};

const ProcessDocumentToolOutputSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    {
      allOf: [
        { $ref: "#/components/schemas/SuccessToolResult" },
        {
          type: "object",
          properties: {
            data: {
              type: "string",
              format: "uuid",
              description: "Document ID",
              example: randomUUID(),
            },
          },
        },
      ],
    },
    { $ref: "#/components/schemas/ErrorToolResult" },
  ],
};

const ReadDocumentToolInputSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Document ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      description: "Document name",
      example: "notes.txt",
    },
    query: {
      type: "string",
      description: "Query for vector search within the document",
      example: "Project milestones and deadlines",
    },
  },
  required: ["id", "name", "query"],
};

const ReadDocumentToolOutputSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    {
      allOf: [
        { $ref: "#/components/schemas/SuccessToolResult" },
        {
          type: "object",
          properties: {
            data: {
              type: "string",
              description: "The document chunks in XML",
              example: "<document-chunk>...</document-chunk>",
            },
          },
        },
      ],
    },
    { $ref: "#/components/schemas/ErrorToolResult" },
  ],
};

const TextStartPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["text-start"], example: "text-start" },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "messageId"],
};

const TextDeltaPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["text-delta"], example: "text-delta" },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    delta: { type: "string", description: "Text delta", example: "delta" },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "delta", "messageId"],
};

const TextEndPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["text-end"], example: "text-end" },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "messageId"],
};

const ToolCallStartPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["tool-call-start"],
      example: "tool-call-start",
    },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["processDocument", "readDocument"],
      description: "Tool name",
      example: "processDocument",
    },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "name", "messageId"],
};

const ToolCallDeltaPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["tool-call-delta"],
      example: "tool-call-delta",
    },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["processDocument", "readDocument"],
      description: "Tool name",
      example: "processDocument",
    },
    delta: {
      type: "string",
      description: "Tool call input delta",
      example: "delta",
    },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "name", "delta", "messageId"],
};

const ProcessDocumentToolCallPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["tool-call"], example: "tool-call" },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["processDocument"],
      description: "Tool name",
      example: "processDocument",
    },
    input: { $ref: "#/components/schemas/ProcessDocumentToolInput" },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "name", "input", "messageId"],
};

const ReadDocumentToolCallPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["tool-call"], example: "tool-call" },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["readDocument"],
      description: "Tool name",
      example: "readDocument",
    },
    input: { $ref: "#/components/schemas/ReadDocumentToolInput" },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "name", "input", "messageId"],
};

const ToolCallPartSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    { $ref: "#/components/schemas/ProcessDocumentToolCallPart" },
    { $ref: "#/components/schemas/ReadDocumentToolCallPart" },
  ],
};

const ProcessDocumentToolCallResultPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["tool-call-result"],
      example: "tool-call-result",
    },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["processDocument"],
      description: "Tool name",
      example: "processDocument",
    },
    input: { $ref: "#/components/schemas/ProcessDocumentToolInput" },
    output: { $ref: "#/components/schemas/ProcessDocumentToolOutput" },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "name", "input", "output", "messageId"],
};

const ReadDocumentToolCallResultPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["tool-call-result"],
      example: "tool-call-result",
    },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["readDocument"],
      description: "Tool name",
      example: "readDocument",
    },
    input: { $ref: "#/components/schemas/ReadDocumentToolInput" },
    output: { $ref: "#/components/schemas/ReadDocumentToolOutput" },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "name", "input", "output", "messageId"],
};

const ToolCallResultPartSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    { $ref: "#/components/schemas/ProcessDocumentToolCallResultPart" },
    { $ref: "#/components/schemas/ReadDocumentToolCallResultPart" },
  ],
};

const ToolCallEndPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["tool-call-end"],
      example: "tool-call-end",
    },
    id: {
      type: "string",
      format: "uuid",
      description: "Part ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["processDocument", "readDocument"],
      description: "Tool name",
      example: "processDocument",
    },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "id", "name", "messageId"],
};

const MessageStartPartSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["message-start"], example: "message-start" },
    messageId: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
  },
  required: ["type", "messageId"],
};

const MessageEndPartSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["message-start"],
          example: "message-start",
        },
        finishReason: {
          type: "string",
          enum: [
            "stop",
            "length",
            "content-filter",
            "tool-calls",
            "other",
            "unknown",
            "interrupted",
          ],
          description: "Reason for message completion",
          example: "stop",
        },
        messageId: {
          type: "string",
          format: "uuid",
          description: "Message ID",
          example: randomUUID(),
        },
      },
      required: ["type", "finishReason", "messageId"],
    },
    {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["message-start"],
          example: "message-start",
        },
        finishReason: {
          type: "string",
          enum: ["error"],
          description: "Reason for message completion",
          example: "error",
        },
        error: {
          type: "string",
          description: "Error message",
          example: "An error occurred while generating the message.",
        },
        messageId: {
          type: "string",
          format: "uuid",
          description: "Message ID",
          example: randomUUID(),
        },
      },
      required: ["type", "finishReason", "error", "messageId"],
    },
  ],
};

const MessagePartSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    { $ref: "#/components/schemas/TextStartPart" },
    { $ref: "#/components/schemas/TextDeltaPart" },
    { $ref: "#/components/schemas/TextEndPart" },
    { $ref: "#/components/schemas/ToolCallStartPart" },
    { $ref: "#/components/schemas/ToolCallDeltaPart" },
    { $ref: "#/components/schemas/ToolCallPart" },
    { $ref: "#/components/schemas/ToolCallResultPart" },
    { $ref: "#/components/schemas/ToolCallEndPart" },
    { $ref: "#/components/schemas/MessageStartPart" },
    { $ref: "#/components/schemas/MessageEndPart" },
  ],
};

const TextContentBlockSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["text"], example: "text" },
    id: {
      type: "string",
      format: "uuid",
      description: "Content block ID",
      example: randomUUID(),
    },
    text: {
      type: "string",
      description: "Text content",
      example: "What is Node JS?",
    },
  },
  required: ["type", "id", "text"],
};

const DocumentContentBlockSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["document"], example: "document" },
    id: {
      type: "string",
      format: "uuid",
      description: "Content block ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      description: "Document name",
      example: "notes.txt",
    },
  },
  required: ["type", "id", "name"],
};

const ProcessDocumentToolCallContentBlockSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["tool-call"], example: "tool-call" },
    id: {
      type: "string",
      format: "uuid",
      description: "Content block ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["processDocument"],
      description: "Tool name",
      example: "processDocument",
    },
    input: { $ref: "#/components/schemas/ProcessDocumentToolInput" },
    output: { $ref: "#/components/schemas/ProcessDocumentToolOutput" },
  },
  required: ["type", "id", "name", "input", "output"],
};

const ReadDocumentToolCallContentBlockSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["tool-call"], example: "tool-call" },
    id: {
      type: "string",
      format: "uuid",
      description: "Content block ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      enum: ["readDocument"],
      description: "Tool name",
      example: "readDocument",
    },
    input: { $ref: "#/components/schemas/ReadDocumentToolInput" },
    output: { $ref: "#/components/schemas/ReadDocumentToolOutput" },
  },
  required: ["type", "id", "name", "input", "output"],
};

const ToolCallContentBlockSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    { $ref: "#/components/schemas/ProcessDocumentToolCallContentBlock" },
    { $ref: "#/components/schemas/ReadDocumentToolCallContentBlock" },
  ],
};

const UserContentBlockSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    { $ref: "#/components/schemas/TextContentBlock" },
    { $ref: "#/components/schemas/DocumentContentBlock" },
  ],
};

const AssistantContentBlockSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    { $ref: "#/components/schemas/TextContentBlock" },
    { $ref: "#/components/schemas/ToolCallContentBlock" },
  ],
};

const UserMessageSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
    role: { type: "string", enum: ["user"], example: "user" },
    content: {
      type: "array",
      items: { $ref: "#/components/schemas/UserContentBlock" },
      description: "Array of content blocks in the message",
    },
    parentMessageId: {
      type: "string",
      format: "uuid",
      nullable: true,
      description: "Parent message ID",
      example: randomUUID(),
    },
    chatId: {
      type: "string",
      format: "uuid",
      description: "Chat ID",
      example: randomUUID(),
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Message creation timestamp",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Last message update timestamp",
    },
  },
};

const AssistantMessageSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
    role: { type: "string", enum: ["assistant"], example: "assistant" },
    content: {
      type: "array",
      items: { $ref: "#/components/schemas/AssistantContentBlock" },
      description: "Array of content blocks in the message",
    },
    feedback: {
      type: "string",
      enum: ["like", "dislike", "neutral"],
      nullable: true,
      description: "User feedback on the message",
      example: "like",
    },
    finishReason: {
      type: "string",
      enum: [
        "stop",
        "length",
        "content-filter",
        "tool-calls",
        "error",
        "other",
        "unknown",
        "interrupted",
      ],
      description: "Reason for message completion",
      example: "stop",
    },
    parentMessageId: {
      type: "string",
      format: "uuid",
      nullable: true,
      description: "Parent message ID",
      example: randomUUID(),
    },
    chatId: {
      type: "string",
      format: "uuid",
      description: "Chat ID",
      example: randomUUID(),
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Message creation timestamp",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Last message update timestamp",
    },
  },
};

const MessageSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    { $ref: "#/components/schemas/UserMessage" },
    { $ref: "#/components/schemas/AssistantMessage" },
  ],
};

export const messageSchemas = {
  SuccessToolResult: SuccessToolResultSchema,
  ErrorToolResult: ErrorToolResultSchema,
  ProcessDocumentToolInput: ProcessDocumentToolInputSchema,
  ProcessDocumentToolOutput: ProcessDocumentToolOutputSchema,
  ReadDocumentToolInput: ReadDocumentToolInputSchema,
  ReadDocumentToolOutput: ReadDocumentToolOutputSchema,
  TextStartPart: TextStartPartSchema,
  TextDeltaPart: TextDeltaPartSchema,
  TextEndPart: TextEndPartSchema,
  ToolCallStartPart: ToolCallStartPartSchema,
  ToolCallDeltaPart: ToolCallDeltaPartSchema,
  ProcessDocumentToolCallPart: ProcessDocumentToolCallPartSchema,
  ReadDocumentToolCallPart: ReadDocumentToolCallPartSchema,
  ToolCallPart: ToolCallPartSchema,
  ProcessDocumentToolCallResultPart: ProcessDocumentToolCallResultPartSchema,
  ReadDocumentToolCallResultPart: ReadDocumentToolCallResultPartSchema,
  ToolCallResultPart: ToolCallResultPartSchema,
  ToolCallEndPart: ToolCallEndPartSchema,
  MessageStartPart: MessageStartPartSchema,
  MessageEndPart: MessageEndPartSchema,
  MessagePart: MessagePartSchema,
  TextContentBlock: TextContentBlockSchema,
  DocumentContentBlock: DocumentContentBlockSchema,
  ProcessDocumentToolCallContentBlock:
    ProcessDocumentToolCallContentBlockSchema,
  ReadDocumentToolCallContentBlock: ReadDocumentToolCallContentBlockSchema,
  ToolCallContentBlock: ToolCallContentBlockSchema,
  UserContentBlock: UserContentBlockSchema,
  AssistantContentBlock: AssistantContentBlockSchema,
  UserMessage: UserMessageSchema,
  AssistantMessage: AssistantMessageSchema,
  Message: MessageSchema,
};
