import { randomUUID } from "crypto";
import express from "express";
import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { Application } from "../../../src/app";
import { config } from "../../../src/config";
import { Project } from "../../../src/models/entities/project";
import { User } from "../../../src/models/entities/user";
import {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "../../../src/models/requests/project";
import { ApplicationErrorCode } from "../../../src/utils/errors";
import { HttpStatusCode } from "../../../src/utils/types";
import {
  createTestPool,
  insertDocuments,
  insertProjects,
  insertUsers,
  truncateProjects,
  truncateUsers,
} from "../../utils";

describe("Project Routes", () => {
  const expressApp = express();
  const pool = createTestPool();
  const app = new Application(expressApp, pool);

  const mockUsers: User[] = Array.from({ length: 2 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const accessTokens = mockUsers.map((user) =>
    jsonwebtoken.sign(
      {
        session: {
          id: randomUUID(),
          expiresAt: new Date(),
          userId: user.id,
          createdAt: new Date(),
        },
        user: { id: user.id, name: user.name, email: user.email },
      },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    )
  );

  let projectNumber = 0;
  const mockProjects: Project[] = mockUsers.flatMap((user) =>
    Array.from({ length: 5 }, () => ({
      id: randomUUID(),
      title: `Project ${++projectNumber}`,
      description: `Project ${projectNumber} Description`,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  let documentNumber = 0;
  const mockDocuments = mockProjects.slice(0, 3).flatMap((project) =>
    Array.from({ length: 5 }, () => ({
      id: randomUUID(),
      key: `test/document-${++documentNumber}.txt`,
      name: `Document ${documentNumber}`,
      mimetype: "text/plain",
      sizeInBytes: 1024,
      isProcessed: false,
      chatId: null,
      projectId: project.id,
      userId: project.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  beforeAll(async () => {
    await insertUsers(mockUsers, pool);
  });

  beforeEach(async () => {
    await insertProjects(mockProjects, pool);
    await insertDocuments(mockDocuments, pool);
  });

  afterEach(async () => {
    await truncateProjects(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await app.end();
  });

  describe("getProjects", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const response = await request(expressApp).get("/api/projects");

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a success response with the user projects ordered by creation date desc", async () => {
      const mockUser = mockUsers[0];

      const response = await request(expressApp)
        .get("/api/projects")
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: mockProjects
          .filter((project) => project.userId === mockUser.id)
          .sort(
            (projectA, projectB) =>
              projectB.createdAt!.getTime() - projectA.createdAt!.getTime()
          )
          .map((project) => ({
            ...project,
            createdAt: project.createdAt!.toISOString(),
            updatedAt: project.updatedAt!.toISOString(),
          })),
      });
    });
  });

  describe("getProject", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockProject = mockProjects[0];

      const response = await request(expressApp).get(
        `/api/projects/${mockProject.id}`
      );

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when project does not exist", async () => {
      const response = await request(expressApp)
        .get(`/api/projects/${randomUUID()}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when project is from another user", async () => {
      const mockProject = mockProjects[6];

      const response = await request(expressApp)
        .get(`/api/projects/${mockProject.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with the project", async () => {
      const mockProject = mockProjects[0];

      const response = await request(expressApp)
        .get(`/api/projects/${mockProject.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockProject,
          createdAt: mockProject.createdAt!.toISOString(),
          updatedAt: mockProject.updatedAt!.toISOString(),
        },
      });
    });

    it("should return a success response with the project including documents", async () => {
      const mockProject = mockProjects[0];

      const response = await request(expressApp)
        .get(`/api/projects/${mockProject.id}`)
        .query({ expand: ["documents"] })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockProject,
          createdAt: mockProject.createdAt!.toISOString(),
          updatedAt: mockProject.updatedAt!.toISOString(),
          documents: mockDocuments
            .filter((document) => document.projectId === mockProject.id)
            .map((document) => ({
              ...document,
              createdAt: document.createdAt!.toISOString(),
              updatedAt: document.updatedAt!.toISOString(),
            })),
        },
      });
    });
  });

  describe("createProject", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const response = await request(expressApp).post("/api/projects");

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a success response with the project id", async () => {
      const createProjectRequest: CreateProjectRequest = {
        id: randomUUID(),
        title: "New Project",
        description: "New Project Description",
      };

      const response = await request(expressApp)
        .post("/api/projects")
        .send(createProjectRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: createProjectRequest.id,
      });
    });
  });

  describe("updateProject", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockProject = mockProjects[0];

      const updateProjectRequest: UpdateProjectRequest = {
        title: "Updated Project Title",
        description: "Updated Project Description",
      };

      const response = await request(expressApp)
        .patch(`/api/projects/${mockProject.id}`)
        .send(updateProjectRequest);

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a bad request response when request does not match schema", async () => {
      const mockProject = mockProjects[0];

      const response = await request(expressApp)
        .patch(`/api/projects/${mockProject.id}`)
        .send({ title: 123 })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.BadRequest);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.BadRequest,
        }),
      });
    });

    it("should return a not found response when project does not exist", async () => {
      const updateProjectRequest: UpdateProjectRequest = {
        title: "Updated Project Title",
        description: "Updated Project Description",
      };

      const response = await request(expressApp)
        .patch(`/api/projects/${randomUUID()}`)
        .send(updateProjectRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when project is from another user", async () => {
      const mockProject = mockProjects[6];

      const updateProjectRequest: UpdateProjectRequest = {
        title: "Updated Project Title",
        description: "Updated Project Description",
      };

      const response = await request(expressApp)
        .patch(`/api/projects/${mockProject.id}`)
        .send(updateProjectRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with the project id", async () => {
      const mockProject = mockProjects[0];

      const updateProjectRequest: UpdateProjectRequest = {
        title: "Updated Project Title",
        description: "Updated Project Description",
      };

      const response = await request(expressApp)
        .patch(`/api/projects/${mockProject.id}`)
        .send(updateProjectRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockProject.id });
    });
  });

  describe("deleteProject", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockProject = mockProjects[0];

      const response = await request(expressApp).delete(
        `/api/projects/${mockProject.id}`
      );

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when project does not exist", async () => {
      const response = await request(expressApp)
        .delete(`/api/projects/${randomUUID()}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when project is from another user", async () => {
      const mockProject = mockProjects[6];

      const response = await request(expressApp)
        .delete(`/api/projects/${mockProject.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with the project id", async () => {
      const mockProject = mockProjects[0];

      const response = await request(expressApp)
        .delete(`/api/projects/${mockProject.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockProject.id });
    });
  });
});
