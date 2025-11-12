import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const GetChatsParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "query",
    name: "search",
    schema: { type: "string" },
    description: "Search term to filter chats by title",
    example: "Learning Node JS",
  },
  {
    in: "query",
    name: "projectId",
    schema: { type: "string" },
    description: "Filter chats by associated project ID",
    example: randomUUID(),
  },
  {
    in: "query",
    name: "cursor",
    schema: { type: "string", format: "date-time" },
    description: "Creation timestamp cursor for pagination",
  },
  {
    in: "query",
    name: "limit",
    schema: { type: "number", default: 20, minimum: 0, maximum: 50 },
    description: "Maximum number of chats to return",
    example: 25,
  },
];

const GetChatParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "chatId",
    schema: { type: "string", format: "uuid" },
    description: "Chat ID",
    example: randomUUID(),
    required: true,
  },
  {
    in: "query",
    name: "expand",
    schema: { type: "array", items: { type: "string", enum: ["project"] } },
    description: "Related entities to expand in the response",
    example: ["project"],
  },
];

const GetChatMessagesParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "chatId",
    schema: { type: "string", format: "uuid" },
    description: "Chat ID",
    example: randomUUID(),
    required: true,
  },
];

const CreateChatRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Chat ID",
      example: randomUUID(),
    },
    message: {
      type: "array",
      items: { $ref: "#/components/schemas/UserContentBlock" },
    },
    projectId: {
      type: "string",
      format: "uuid",
      nullable: true,
      description: "Associated project ID",
      example: randomUUID(),
    },
  },
  required: ["id", "message"],
};

const SendMessageParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "chatId",
    schema: { type: "string", format: "uuid" },
    description: "Chat ID",
    example: randomUUID(),
    required: true,
  },
];

const SendMessageRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Message ID",
      example: randomUUID(),
    },
    content: {
      type: "array",
      items: { $ref: "#/components/schemas/UserContentBlock" },
    },
    parentMessageId: {
      type: "string",
      format: "uuid",
      nullable: true,
      description: "Parent message ID",
      example: randomUUID(),
    },
  },
  required: ["id", "message"],
};

const UpdateChatParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "chatId",
    schema: { type: "string", format: "uuid" },
    description: "Chat ID",
    example: randomUUID(),
    required: true,
  },
];

const UpdateChatRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "New chat title",
      example: "Exploring Node JS",
    },
  },
};

const UpdateMessageParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "chatId",
    schema: { type: "string", format: "uuid" },
    description: "Chat ID",
    example: randomUUID(),
    required: true,
  },
  {
    in: "path",
    name: "messageId",
    schema: { type: "string", format: "uuid" },
    description: "Message ID",
    example: randomUUID(),
    required: true,
  },
];

const UpdateMessageRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    feedback: {
      type: "string",
      enum: ["like", "dislike", "neutral"],
      description: "User feedback on the message",
      example: "like",
    },
  },
};

const DeleteChatParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "chatId",
    schema: { type: "string", format: "uuid" },
    description: "Chat ID",
    example: randomUUID(),
    required: true,
  },
];

export const chatParameters = {
  GetChatsParameters,
  GetChatParameters,
  GetChatMessagesParameters,
  SendMessageParameters,
  UpdateChatParameters,
  UpdateMessageParameters,
  DeleteChatParameters,
};

export const chatRequestSchemas = {
  CreateChatRequest: CreateChatRequestSchema,
  SendMessageRequest: SendMessageRequestSchema,
  UpdateChatRequest: UpdateChatRequestSchema,
  UpdateMessageRequest: UpdateMessageRequestSchema,
};
