import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const GetProjectsResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: { $ref: "#/components/schemas/Project" },
          description: "List of projects",
        },
      },
    },
  ],
};

const GetProjectResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          $ref: "#/components/schemas/ProjectSchema",
          description: "Project",
        },
      },
    },
  ],
};

const CreateProjectResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Project ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

const UpdateProjectResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Project ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

const DeleteProjectResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Project ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

export const projectResponseSchemas = {
  GetProjectsResponse: GetProjectsResponseSchema,
  GetProjectResponse: GetProjectResponseSchema,
  CreateProjectResponse: CreateProjectResponseSchema,
  UpdateProjectResponse: UpdateProjectResponseSchema,
  DeleteProjectResponse: DeleteProjectResponseSchema,
};
