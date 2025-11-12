import { OpenAPIV3 } from "openapi-types";

const SuccessResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: { type: "boolean", enum: [true], example: true },
    data: { type: "object", description: "Response data" },
  },
  required: ["success", "data"],
};

const ErrorResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: { type: "boolean", enum: [false], example: false },
    error: {
      type: "object",
      properties: {
        code: { type: "number", description: "Code that classifies the error" },
      },
    },
  },
  required: ["success", "error"],
};

const BadRequestResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/ErrorResponse" },
    {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: { code: { type: "number", enum: [400], example: 400 } },
        },
      },
    },
  ],
};

const BadRequestResponse: OpenAPIV3.ResponseObject = {
  description: "Bad Request",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/BadRequestResponse" },
    },
  },
};

const UnauthorizedResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/ErrorResponse" },
    {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: { code: { type: "number", enum: [401], example: 401 } },
        },
      },
    },
  ],
};

const UnauthorizedResponse: OpenAPIV3.ResponseObject = {
  description: "Unauthorized",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/UnauthorizedResponse" },
    },
  },
};

const NotFoundResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/ErrorResponse" },
    {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: { code: { type: "number", enum: [404], example: 404 } },
        },
      },
    },
  ],
};

const NotFoundResponse: OpenAPIV3.ResponseObject = {
  description: "Not Found",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/NotFoundResponse" },
    },
  },
};

const InternalServerErrorResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/ErrorResponse" },
    {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: { code: { type: "number", enum: [500], example: 500 } },
        },
      },
    },
  ],
};

const InternalServerErrorResponse: OpenAPIV3.ResponseObject = {
  description: "Internal Server Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/InternalServerErrorResponse" },
    },
  },
};

const InvalidEmailOrPasswordResponseSchema: OpenAPIV3.SchemaObject = {
  description: "Invalid Email or Password",
  allOf: [
    { $ref: "#/components/schemas/ErrorResponse" },
    {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: { code: { type: "number", enum: [1000], example: 1000 } },
        },
      },
    },
  ],
};

export const responseSchemas = {
  SuccessResponse: SuccessResponseSchema,
  ErrorResponse: ErrorResponseSchema,
  BadRequestResponse: BadRequestResponseSchema,
  UnauthorizedResponse: UnauthorizedResponseSchema,
  NotFoundResponse: NotFoundResponseSchema,
  InternalServerErrorResponse: InternalServerErrorResponseSchema,
  InvalidEmailOrPasswordResponse: InvalidEmailOrPasswordResponseSchema,
};

export const responses = {
  BadRequest: BadRequestResponse,
  Unauthorized: UnauthorizedResponse,
  NotFound: NotFoundResponse,
  InternalServerError: InternalServerErrorResponse,
};
