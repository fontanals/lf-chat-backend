import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const SignupResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Account email",
          example: "john.doe@example.com",
        },
      },
    },
  ],
};

const VerifyAccountResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Account email",
          example: "john.doe@example.com",
        },
      },
    },
  ],
};

const SigninResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            session: {
              $ref: "#/components/schemas/Session",
              description: "New session",
            },
            user: {
              $ref: "#/components/schemas/User",
              description: "User signed in",
            },
          },
          required: ["session", "user"],
        },
      },
    },
  ],
};

const SignoutResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: { type: "string", description: "User ID", example: randomUUID() },
      },
    },
  ],
};

const RecoverPasswordResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Account email",
          example: "john.doe@example.com",
        },
      },
    },
  ],
};

const ResetPasswordResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Account email",
          example: "john.doe@example.com",
        },
      },
    },
  ],
};

export const authResponseSchemas = {
  SignupResponse: SignupResponseSchema,
  VerifyAccountResponse: VerifyAccountResponseSchema,
  SigninResponse: SigninResponseSchema,
  SignoutResponse: SignoutResponseSchema,
  RecoverPasswordResponse: RecoverPasswordResponseSchema,
  ResetPasswordResponse: ResetPasswordResponseSchema,
};
