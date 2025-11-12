import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const UserSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "User ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      description: "User name",
      example: "John Doe",
    },
    email: {
      type: "string",
      format: "email",
      description: "User email",
      example: "john.doe@example.com",
    },
    displayName: {
      type: "string",
      description: "User display name",
      example: "Johnny",
    },
    customPrompt: {
      type: "string",
      nullable: true,
      description: "User custom prompt",
      example: "Be as concise as possible unless asked to elaborate.",
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Account creation timestamp",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Account last update timestamp",
    },
  },
  required: ["id", "name", "email", "displayName"],
};

export const userSchemas = { User: UserSchema };
