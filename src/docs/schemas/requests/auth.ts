import { OpenAPIV3 } from "openapi-types";

const SignupRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    name: { type: "string", description: "User name", example: "John Doe" },
    email: {
      type: "string",
      format: "email",
      description: "Account email",
      example: "john.doe@example.com",
    },
    password: {
      type: "string",
      format: "password",
      description: "Account password",
      example: "strong-password",
    },
  },
  required: ["name", "email", "password"],
};

const VerifyAccountRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    token: { type: "string", description: "Verification token" },
  },
  required: ["token"],
};

const SigninRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email",
      description: "Account email",
      example: "john.doe@example.com",
    },
    password: {
      type: "string",
      format: "password",
      description: "Account password",
      example: "strong-password",
    },
  },
  required: ["email", "password"],
};

const RecoverPasswordRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email",
      description: "Account email",
      example: "john.doe@example.com",
    },
  },
  required: ["email"],
};

const ResetPasswordRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    token: { type: "string", description: "Verification token" },
    newPassword: {
      type: "string",
      description: "New password",
      example: "password",
    },
  },
  required: ["token", "newPassword"],
};

export const authRequestSchemas = {
  SignupRequest: SignupRequestSchema,
  VerifyAccountRequest: VerifyAccountRequestSchema,
  SigninRequest: SigninRequestSchema,
  RecoverPasswordRequest: RecoverPasswordRequestSchema,
  ResetPasswordRequest: ResetPasswordRequestSchema,
};
