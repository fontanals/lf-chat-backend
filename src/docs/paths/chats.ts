import { OpenAPIV3 } from "openapi-types";
import { chatParameters } from "../schemas/requests/chat";

export const chatsPaths: OpenAPIV3.PathsObject = {
  "/api/chats": {
    get: {
      summary: "Get chats paginated",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      parameters: chatParameters.GetChatsParameters,
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetChatsResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    post: {
      summary: "Create chat",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateChatRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "text/event-stream": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/SendMessageEvent" },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    delete: {
      summary: "Delete all chats",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeleteAllChatsResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/chats/{chatId}": {
    get: {
      summary: "Get chat",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      parameters: chatParameters.GetChatParameters,
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetChatResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    patch: {
      summary: "Update chat",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      parameters: chatParameters.UpdateChatParameters,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateChatRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateChatResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    delete: {
      summary: "Delete chat",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      parameters: chatParameters.DeleteChatParameters,
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeleteChatResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/chats/{chatId}/messages": {
    get: {
      summary: "Get chat messages tree",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      parameters: chatParameters.GetChatMessagesParameters,
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetChatMessagesResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    post: {
      summary: "Send message to chat",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      parameters: chatParameters.SendMessageParameters,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SendMessageRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "text/event-stream": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/SendMessageEvent" },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/chats/{chatId}/messages/{messageId}": {
    patch: {
      summary: "Update chat message",
      tags: ["Chats"],
      security: [{ BearerAuth: [] }],
      parameters: chatParameters.UpdateMessageParameters,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateMessageRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMessageResponse" },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
};
