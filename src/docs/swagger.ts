import swaggerJSDoc from "swagger-jsdoc";
import { authPaths } from "./paths/auth";
import { chatsPaths } from "./paths/chats";
import { documentsPaths } from "./paths/documents";
import { projectsPaths } from "./paths/projects";
import { userPaths } from "./paths/user";
import { chatSchemas } from "./schemas/entities/chat";
import { documentSchemas } from "./schemas/entities/document";
import { messageSchemas } from "./schemas/entities/message";
import { projectSchemas } from "./schemas/entities/project";
import { sessionSchemas } from "./schemas/entities/session";
import { userSchemas } from "./schemas/entities/user";
import { authRequestSchemas } from "./schemas/requests/auth";
import { chatRequestSchemas } from "./schemas/requests/chat";
import { documentRequestSchemas } from "./schemas/requests/document";
import { projectRequestSchemas } from "./schemas/requests/project";
import { userRequestSchemas } from "./schemas/requests/user";
import { authResponseSchemas } from "./schemas/responses/auth";
import { chatResponseSchemas } from "./schemas/responses/chat";
import { documentResponseSchemas } from "./schemas/responses/document";
import { projectResponseSchemas } from "./schemas/responses/project";
import { responses, responseSchemas } from "./schemas/responses/response";
import { userResponseSchemas } from "./schemas/responses/user";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Chat API",
      version: "1.0.0",
      description: "API documentation for the AI Chat application",
    },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // Entities
        ...userSchemas,
        ...sessionSchemas,
        ...projectSchemas,
        ...chatSchemas,
        ...messageSchemas,
        ...documentSchemas,
        // Requests
        ...authRequestSchemas,
        ...userRequestSchemas,
        ...projectRequestSchemas,
        ...chatRequestSchemas,
        ...documentRequestSchemas,
        // Responses
        ...responseSchemas,
        ...authResponseSchemas,
        ...userResponseSchemas,
        ...projectResponseSchemas,
        ...chatResponseSchemas,
        ...documentResponseSchemas,
      },
      responses: { ...responses },
    },
    paths: {
      ...authPaths,
      ...userPaths,
      ...chatsPaths,
      ...projectsPaths,
      ...documentsPaths,
    },
  },
  apis: [],
});
