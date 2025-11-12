import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const UploadDocumentResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Document ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

const DeleteDocumentResponseSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    { $ref: "#/components/schemas/SuccessResponse" },
    {
      type: "object",
      properties: {
        data: {
          type: "string",
          format: "uuid",
          description: "Document ID",
          example: randomUUID(),
        },
      },
    },
  ],
};

export const documentResponseSchemas = {
  UploadDocumentResponse: UploadDocumentResponseSchema,
  DeleteDocumentResponse: DeleteDocumentResponseSchema,
};
