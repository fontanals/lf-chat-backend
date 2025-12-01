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
  "/api/verify-account": {
    post: {
      summary: "Verify account",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VerifyAccountRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyAccountResponse" },
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
      summary: "Sign out user",
      tags: ["Auth"],
      security: [{ BearerAuth: [] }],
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
  "/api/recover-password": {
    post: {
      summary: "Recover password",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RecoverPasswordRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecoverPasswordResponse" },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/reset-password": {
    post: {
      summary: "Reset password",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordResponse" },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
};
