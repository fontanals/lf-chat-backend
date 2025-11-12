import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const SignupResponseSchema: OpenAPIV3.SchemaObject = {
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
              description: "New user",
            },
          },
          required: ["session", "user"],
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

export const authResponseSchemas = {
  SignupResponse: SignupResponseSchema,
  SigninResponse: SigninResponseSchema,
  SignoutResponse: SignoutResponseSchema,
};
