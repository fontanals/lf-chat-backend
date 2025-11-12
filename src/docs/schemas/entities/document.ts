import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const DocumentSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Document ID",
      example: randomUUID(),
    },
    name: {
      type: "string",
      description: "Document name",
      example: "notes.txt",
    },
    mimetype: {
      type: "string",
      description: "Document MIME type",
      example: "text/plain",
    },
    sizeInBytes: {
      type: "integer",
      description: "Document size in bytes",
      example: 2048,
    },
    chatId: {
      type: "string",
      nullable: true,
      format: "uuid",
      description: "Chat ID where the document was uploaded",
      example: randomUUID(),
    },
    projectId: {
      type: "string",
      nullable: true,
      format: "uuid",
      description: "Project ID where the document was uploaded",
      example: randomUUID(),
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
      description: "Creation timestamp",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Last update timestamp",
    },
  },
  required: ["id", "name", "mimetype", "sizeInBytes", "userId"],
};

export const documentSchemas = { Document: DocumentSchema };
