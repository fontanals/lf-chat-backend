import { OpenAPIV3 } from "openapi-types";
import { projectParameters } from "../schemas/requests/project";

export const projectsPaths: OpenAPIV3.PathsObject = {
  "/api/projects": {
    get: {
      summary: "Get projects",
      tags: ["Projects"],
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetProjectsResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    post: {
      summary: "Create project",
      tags: ["Projects"],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateProjectRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProjectResponse" },
            },
          },
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  },
  "/api/projects/{projectId}": {
    get: {
      summary: "Get project",
      tags: ["Projects"],
      security: [{ BearerAuth: [] }],
      parameters: projectParameters.GetProjectParameters,
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetProjectResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    patch: {
      summary: "Update project",
      tags: ["Projects"],
      security: [{ BearerAuth: [] }],
      parameters: projectParameters.UpdateProjectParameters,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateProjectRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProjectResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
    delete: {
      summary: "Delete project",
      tags: ["Projects"],
      security: [{ BearerAuth: [] }],
      parameters: projectParameters.DeleteProjectParameters,
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeleteProjectResponse" },
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
