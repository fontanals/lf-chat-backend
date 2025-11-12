import { OpenAPIV3 } from "openapi-types";

const UpdateUserRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The new username for the user.",
      example: "John Doe",
    },
    displayName: {
      type: "string",
      description: "The new display name for the user.",
      example: "Johnny",
    },
    customPrompt: {
      type: "string",
      description: "User custom prompt for AI assistant.",
      example: "Be as concise as possible unless asked to elaborate.",
    },
  },
};

const ChangePasswordRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    currentPassword: {
      type: "string",
      description: "The user's current password.",
      example: "old-password",
    },
    newPassword: {
      type: "string",
      description: "The user's new password.",
      example: "new-strong-password",
    },
  },
};

export const userRequestSchemas = {
  UpdateUserRequest: UpdateUserRequestSchema,
  ChangePasswordRequest: ChangePasswordRequestSchema,
};
