import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const ProjectSchema: OpenAPIV3.SchemaObject = {
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
      example: "A project to learn Node JS basics and advanced concepts.",
    },
    userId: {
      type: "string",
      format: "uuid",
      description: "Owner user ID",
      example: randomUUID(),
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Project creation timestamp",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Project last update timestamp",
    },
  },
  required: ["id", "title", "description", "userId"],
};

export const projectSchemas = { Project: ProjectSchema };
