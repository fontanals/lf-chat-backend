import { OpenAPIV3 } from "openapi-types";
import { documentParameters } from "../schemas/requests/document";

export const documentsPaths: OpenAPIV3.PathsObject = {
  "/api/documents/upload": {
    post: {
      summary: "Upload a new document",
      tags: ["Documents"],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: { $ref: "#/components/schemas/UploadDocumentRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UploadDocumentResponse" },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/documents/{documentId}": {
    delete: {
      summary: "Delete document",
      tags: ["Documents"],
      security: [{ BearerAuth: [] }],
      parameters: documentParameters.DeleteDocumentParameters,
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeleteDocumentResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
};
