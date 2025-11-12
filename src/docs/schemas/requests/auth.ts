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

export const authRequestSchemas = {
  SignupRequest: SignupRequestSchema,
  SigninRequest: SigninRequestSchema,
};
