import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { FileStorage } from "../../../src/files/file-storage";
import { Document } from "../../../src/models/entities/document";
import { Project } from "../../../src/models/entities/project";
import { User } from "../../../src/models/entities/user";
import {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "../../../src/models/requests/project";
import { ProjectRepository } from "../../../src/repositories/project";
import { AuthContext } from "../../../src/services/auth";
import { ProjectService } from "../../../src/services/project";
import {
  createTestPool,
  insertDocuments,
  insertProjects,
  insertUsers,
  truncateProjects,
  truncateUsers,
} from "../../utils";

describe("ProjectService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const fileStorage = new FileStorage();
  const projectRepository = new ProjectRepository(dataContext);
  const projectService = new ProjectService(
    dataContext,
    fileStorage,
    projectRepository
  );

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    createdAt: addDays(new Date(), -100),
    updatedAt: addDays(new Date(), -100),
  };

  const authContext: AuthContext = {
    session: {
      id: randomUUID(),
      expiresAt: new Date().toISOString(),
      userId: mockUser.id,
      createdAt: new Date().toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  const mockProjects: Project[] = Array.from({ length: 15 }, (_, index) => ({
    id: randomUUID(),
    title: `Project ${index + 1}`,
    description: `Project ${index + 1} Description`,
    userId: mockUser.id,
    createdAt: addDays(mockUser.createdAt!, -100 + index),
    updatedAt: addDays(mockUser.createdAt!, -100 + index),
  }));

  let documentNumber = 0;
  const mockDocuments: Document[] = mockProjects
    .slice(0, 3)
    .flatMap((project) =>
      Array.from({ length: 5 }, (_, index) => ({
        id: randomUUID(),
        key: randomUUID(),
        name: `Document ${++documentNumber}`,
        mimetype: "text/plain",
        sizeInBytes: 1024,
        isProcessed: false,
        chatId: null,
        projectId: project.id,
        userId: mockUser.id,
        createdAt: addDays(project.createdAt!, index),
        updatedAt: addDays(project.createdAt!, index),
      }))
    );

  beforeAll(async () => {
    await insertUsers([mockUser], pool);
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
    await pool.end();
  });

  describe("getProjects", () => {
    it("should return projects ordered by creation date desc", async () => {
      const response = await projectService.getProjects(authContext);

      expect(response).toEqual(
        [...mockProjects].sort(
          (projectA, projectB) =>
            projectB.createdAt!.getTime() - projectA.createdAt!.getTime()
        )
      );
    });
  });

  describe("getProject", () => {
    it("should return project", async () => {
      const mockProject = mockProjects[0];

      const response = await projectService.getProject(
        { projectId: mockProject.id },
        {},
        authContext
      );

      expect(response).toEqual(mockProject);
    });

    it("should return project including documents", async () => {
      const mockProject = mockProjects[0];

      const response = await projectService.getProject(
        { projectId: mockProject.id },
        { expand: ["documents"] },
        authContext
      );

      expect(response).toEqual({
        ...mockProject,
        documents: mockDocuments.filter(
          (document) => document.projectId === mockProject.id
        ),
      });
    });
  });

  describe("createProject", () => {
    it("should create a new project and return its id", async () => {
      const request: CreateProjectRequest = {
        id: randomUUID(),
        title: "New Project",
        description: "New Project Description",
      };

      const response = await projectService.createProject(request, authContext);

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(
        expect.arrayContaining([
          ...mockProjects,
          {
            id: request.id,
            title: request.title,
            description: request.description,
            userId: mockUser.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );

      expect(response).toEqual(request.id);
    });
  });

  describe("updateProject", () => {
    it("should update project title and description and return its id", async () => {
      const mockProject = mockProjects[0];

      const request: UpdateProjectRequest = {
        title: "Updated Project Title",
        description: "Updated Project Description",
      };

      const response = await projectService.updateProject(
        { projectId: mockProject.id },
        request,
        authContext
      );

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(
        expect.arrayContaining(
          mockProjects.map((project) =>
            project.id === mockProject.id
              ? {
                  ...project,
                  title: request.title,
                  description: request.description,
                  updatedAt: expect.any(Date),
                }
              : project
          )
        )
      );

      expect(response).toEqual(mockProject.id);
    });
  });

  describe("deleteProject", () => {
    it("should delete project and return its id", async () => {
      const mockProject = mockProjects[0];

      const response = await projectService.deleteProject(
        { projectId: mockProject.id },
        authContext
      );

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(
        expect.arrayContaining(
          mockProjects.filter((project) => project.id !== mockProject.id)
        )
      );

      expect(response).toEqual(mockProject.id);
    });
  });
});
