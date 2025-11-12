import { OpenAPIV3 } from "openapi-types";

export const authPaths: OpenAPIV3.PathsObject = {
  "/api/signup": {
    post: {
      summary: "Sign up a new user",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SignupRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignupResponse" },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/signin": {
    post: {
      summary: "Sign in existing user",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SigninRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SigninResponse" },
            },
          },
        },
        "400": {
          description: "Bad request or invalid credentials",
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/BadRequestResponse" },
                  {
                    $ref: "#/components/schemas/InvalidEmailOrPasswordResponse",
                  },
                ],
              },
            },
          },
        },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/signout": {
    post: {
      summary: "Sign out signed-in user",
      tags: ["Auth"],
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignoutResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
};
