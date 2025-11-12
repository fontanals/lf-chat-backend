import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const ChatSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Chat ID",
      example: randomUUID(),
    },
    title: {
      type: "string",
      description: "Chat title",
      example: "Learning Node JS",
    },
    projectId: {
      type: "string",
      nullable: true,
      format: "uuid",
      description: "Associated project ID",
      example: randomUUID(),
    },
    userId: {
      type: "string",
      format: "uuid",
      description: "Owner user ID",
      example: randomUUID(),
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Creation timestamp",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Last update timestamp",
    },
  },
  required: ["id", "title", "userId"],
};

export const chatSchemas = { Chat: ChatSchema };
