import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const TextStartEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: { type: "string", enum: ["text-start"], example: "text-start" },
    data: { $ref: "#/components/schemas/TextStartPart" },
  },
  required: ["event", "data"],
};

const TextDeltaEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: { type: "string", enum: ["text-delta"], example: "text-delta" },
    data: { $ref: "#/components/schemas/TextDeltaPart" },
  },
  required: ["event", "data"],
};

const TextEndEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: { type: "string", enum: ["text-end"], example: "text-end" },
    data: { $ref: "#/components/schemas/TextEndPart" },
  },
  required: ["event", "data"],
};

const ToolCallStartEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: {
      type: "string",
      enum: ["tool-call-start"],
      example: "tool-call-start",
    },
    data: { $ref: "#/components/schemas/ToolCallStartPart" },
  },
  required: ["event", "data"],
};

const ToolCallDeltaEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: {
      type: "string",
      enum: ["tool-call-delta"],
      example: "tool-call-delta",
    },
    data: { $ref: "#/components/schemas/ToolCallDeltaPart" },
  },
  required: ["event", "data"],
};

const ToolCallEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: { type: "string", enum: ["tool-call"], example: "tool-call" },
    data: { $ref: "#/components/schemas/ToolCallPart" },
  },
  required: ["event", "data"],
};

const ToolCallResultEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: {
      type: "string",
      enum: ["tool-call-result"],
      example: "tool-call-result",
    },
    data: { $ref: "#/components/schemas/ToolCallResultPart" },
  },
  required: ["event", "data"],
};

const ToolCallEndEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: {
      type: "string",
      enum: ["tool-call-end"],
      example: "tool-call-end",
    },
    data: { $ref: "#/components/schemas/ToolCallEndPart" },
  },
  required: ["event", "data"],
};

const MessageStartEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: {
      type: "string",
      enum: ["message-start"],
      example: "message-start",
    },
    data: { $ref: "#/components/schemas/MessageStartPart" },
  },
  required: ["event", "data"],
};

const MessageEndEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: {
      type: "string",
      enum: ["message-end"],
      example: "message-end",
    },
    data: { $ref: "#/components/schemas/MessageEndPart" },
  },
  required: ["event", "data"],
};

const StartEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: { type: "string", enum: ["start"], example: "start" },
  },
  required: ["event"],
};

const EndEventSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    event: { type: "string", enum: ["end"], example: "end" },
  },
  required: ["event"],
};

const SendMessageEventSchema: OpenAPIV3.SchemaObject = {
  oneOf: [
    TextStartEventSchema,
    TextDeltaEventSchema,
    TextEndEventSchema,
    ToolCallStartEventSchema,
    ToolCallDeltaEventSchema,
    ToolCallEventSchema,
    ToolCallResultEventSchema,
    ToolCallEndEventSchema,
    MessageStartEventSchema,
    MessageEndEventSchema,
    StartEventSchema,
    EndEventSchema,
  ],
};

const GetAssistantModeResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          enum: ["open-ai", "mock"],
          description: "Current assistant mode",
          example: "open-ai",
        },
      },
    },
  ],
};

const GetChatsResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/Chat" },
              description: "List of chats",
            },
            totalItems: {
              type: "number",
              description: "Total number of chats",
              example: 42,
            },
            nextCursor: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp cursor for the next page",
            },
          },
          required: ["items", "totalItems"],
        },
      },
    },
  ],
};

const GetChatResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: { $ref: "#/components/schemas/Chat", description: "Chat" },
      },
    },
  ],
};

const GetChatMessagesResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            latestPath: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Latest path message IDs",
              example: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
            },
            rootMessageIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "IDs of root messages",
              example: [randomUUID(), randomUUID()],
            },
            messages: {
              type: "object",
              additionalProperties: { $ref: "#/components/schemas/Message" },
              description: "Mapping of all messages by their IDs",
            },
          },
          description: "Chat message tree",
          required: ["latestPath", "rootMessageIds", "messages"],
        },
      },
    },
  ],
};

const UpdateChatResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Chat ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

const UpdateMessageResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Message ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

const DeleteChatResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Chat ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

export const chatResponseSchemas = {
  SendMessageEvent: SendMessageEventSchema,
  GetAssistantModeResponse: GetAssistantModeResponseSchema,
  GetChatsResponse: GetChatsResponseSchema,
  GetChatResponse: GetChatResponseSchema,
  GetChatMessagesResponse: GetChatMessagesResponseSchema,
  UpdateChatResponse: UpdateChatResponseSchema,
  UpdateMessageResponse: UpdateMessageResponseSchema,
  DeleteChatResponse: DeleteChatResponseSchema,
};
