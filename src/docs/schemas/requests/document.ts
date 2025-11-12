import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const UploadDocumentRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Document ID",
      example: randomUUID(),
    },
    file: {
      type: "string",
      format: "binary",
      description: "File to upload",
      example: "notes.txt",
    },
    projectId: {
      type: "string",
      format: "uuid",
      nullable: true,
      description: "Associated project ID",
      example: randomUUID(),
    },
  },
  required: ["id", "file"],
};

const DeleteDocumentParameters: OpenAPIV3.ParameterObject[] = [
  {
    in: "path",
    name: "documentId",
    schema: { type: "string", format: "uuid" },
    description: "Document ID",
    example: randomUUID(),
    required: true,
  },
];

export const documentParameters = {
  DeleteDocumentParameters,
};

export const documentRequestSchemas = {
  UploadDocumentRequest: UploadDocumentRequestSchema,
};
