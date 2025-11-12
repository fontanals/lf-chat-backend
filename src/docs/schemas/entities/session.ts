import { randomUUID } from "crypto";
import { OpenAPIV3 } from "openapi-types";

const SessionSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Session ID",
      example: randomUUID(),
    },
    expiresAt: {
      type: "string",
      format: "date-time",
      description: "Session expiration timestamp",
    },
    userId: {
      type: "string",
      format: "uuid",
      description: "Associated user ID",
      example: randomUUID(),
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Session creation timestamp",
    },
  },
  required: ["id", "expiresAt", "userId"],
};

export const sessionSchemas = { Session: SessionSchema };
