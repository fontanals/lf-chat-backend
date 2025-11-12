import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const GetUserResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: { $ref: "#/components/schemas/User", description: "User" },
      },
    },
  ],
};

const UpdateUserResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "User ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

const ChangePasswordResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "User ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

const DeleteUserResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "User ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

export const userResponseSchemas = {
  GetUserResponse: GetUserResponseSchema,
  UpdateUserResponse: UpdateUserResponseSchema,
  ChangePasswordResponse: ChangePasswordResponseSchema,
  DeleteUserResponse: DeleteUserResponseSchema,
};
