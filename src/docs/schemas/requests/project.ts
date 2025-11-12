import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const GetProjectParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "projectId",
    schema: { type: "string", format: "uuid" },
    description: "Project ID",
    example: randomUUID(),
    required: true,
  },
  {
    in: "query",
    name: "expand",
    schema: {
      type: "array",
      items: { type: "string", enum: ["documents"] },
    },
    description: "Related entities to expand",
    example: ["documents"],
  },
];

const CreateProjectRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Project ID",
      example: randomUUID(),
    },
    title: {
      type: "string",
      description: "Project title",
      example: "Learning Node JS",
    },
    description: {
      type: "string",
      description: "Project description",
      example: "A project to learn Node JS basics",
    },
  },
  required: ["id", "title", "description"],
};

const UpdateProjectParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "projectId",
    schema: { type: "string", format: "uuid" },
    description: "Project ID",
    example: randomUUID(),
    required: true,
  },
];

const UpdateProjectRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Project title",
      example: "Learning Node JS",
    },
    description: {
      type: "string",
      description: "Project description",
      example: "A project to learn Node JS basics",
    },
  },
};

const DeleteProjectParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "projectId",
    schema: { type: "string", format: "uuid" },
    description: "Project ID",
    example: randomUUID(),
    required: true,
  },
];

export const projectParameters = {
  GetProjectParameters,
  UpdateProjectParameters,
  DeleteProjectParameters,
};

export const projectRequestSchemas = {
  CreateProjectRequest: CreateProjectRequestSchema,
  UpdateProjectRequest: UpdateProjectRequestSchema,
};
