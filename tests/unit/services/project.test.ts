import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { IFileStorage } from "../../../src/files/file-storage";
import { Project } from "../../../src/models/entities/project";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "../../../src/models/requests/project";
import { IProjectRepository } from "../../../src/repositories/project";
import { AuthContext } from "../../../src/services/auth";
import { ProjectService } from "../../../src/services/project";
import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";

describe("ProjectService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let fileStorage: jest.Mocked<IFileStorage>;
  let projectRepository: jest.Mocked<IProjectRepository>;
  let projectService: ProjectService;

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Session = {
    id: randomUUID(),
    userId: mockUser.id,
    expiresAt: new Date(),
    createdAt: new Date(),
  };

  const authContext: AuthContext = {
    session: {
      id: mockSession.id,
      expiresAt: mockSession.expiresAt.toISOString(),
      userId: mockSession.userId,
      createdAt: mockSession.createdAt!.toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  const mockProjects: Project[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    title: `Project ${index + 1}`,
    description: `Project ${index + 1} Description`,
    userId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    fileStorage = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      deleteFiles: jest.fn(),
    };

    projectRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    projectService = new ProjectService(
      dataContext,
      fileStorage,
      projectRepository
    );
  });

  describe("getProjects", () => {
    it("should return projects", async () => {
      projectRepository.findAll.mockResolvedValue(mockProjects);

      const response = await projectService.getProjects(authContext);

      expect(response).toEqual(mockProjects);
    });
  });

  describe("getProject", () => {
    it("should throw not found error when project does not exist", async () => {
      projectRepository.findOne.mockResolvedValue(null);

      try {
        await projectService.getProject(
          { projectId: randomUUID() },
          {},
          authContext
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should return project", async () => {
      const mockProject = mockProjects[0];

      projectRepository.findOne.mockResolvedValue(mockProject);

      const response = await projectService.getProject(
        { projectId: mockProject.id },
        {},
        authContext
      );

      expect(response).toEqual(mockProject);
    });
  });

  describe("createProject", () => {
    it("should throw bad request error when request does not match schema", async () => {
      try {
        await projectService.createProject(
          { id: randomUUID() } as any,
          authContext
        );

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should create project and return its id", async () => {
      const request: CreateProjectRequest = {
        id: randomUUID(),
        title: "Learning Machine Learning",
        description: "A project to learn machine learning concepts",
      };

      const response = await projectService.createProject(request, authContext);

      expect(response).toEqual(request.id);
    });
  });

  describe("updateProject", () => {
    it("should throw bad request error when request does not match schema", async () => {
      const mockProject = mockProjects[0];

      try {
        await projectService.updateProject(
          { projectId: mockProject.id },
          { title: 123 } as any,
          authContext
        );

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should throw not found error when project does not exist", async () => {
      try {
        await projectService.updateProject(
          { projectId: randomUUID() },
          { title: "Project Title Updated" },
          authContext
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should update project and return its id", async () => {
      const mockProject = mockProjects[0];

      projectRepository.exists.mockResolvedValue(true);

      const request: UpdateProjectRequest = {
        title: "Project Title Updated",
      };

      const response = await projectService.updateProject(
        { projectId: mockProject.id },
        request,
        authContext
      );

      expect(response).toEqual(mockProject.id);
    });
  });

  describe("deleteProject", () => {
    it("should throw not found error when project does not exist", async () => {
      try {
        await projectService.deleteProject(
          { projectId: randomUUID() },
          authContext
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should delete project and return its id", async () => {
      const mockProject = mockProjects[0];

      projectRepository.findOne.mockResolvedValue({
        ...mockProject,
        documents: [],
      });

      const response = await projectService.deleteProject(
        { projectId: mockProject.id },
        authContext
      );

      expect(response).toEqual(mockProject.id);
    });
  });
});
