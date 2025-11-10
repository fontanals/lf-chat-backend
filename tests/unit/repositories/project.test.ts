import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Document } from "../../../src/models/entities/document";
import { Project } from "../../../src/models/entities/project";
import { ProjectRepository } from "../../../src/repositories/project";
import { ArrayUtils } from "../../../src/utils/arrays";

describe("ProjectRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let projectRepository: ProjectRepository;

  const mockProjects: Project[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    title: `Project ${index + 1}`,
    description: `Project ${index + 1} Description`,
    userId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  let documentNumber = 0;
  const mockDocuments: Document[] = mockProjects
    .slice(0, 5)
    .flatMap((project) =>
      Array.from({ length: 2 }, () => ({
        id: randomUUID(),
        key: randomUUID(),
        name: `Document ${++documentNumber}`,
        mimetype: "text/plain",
        sizeInBytes: 1024,
        isProcessed: false,
        chatId: null,
        projectId: project.id,
        userId: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    projectRepository = new ProjectRepository(dataContext);
  });

  describe("exists", () => {
    it("should return false when no project is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const exists = await projectRepository.exists();

      expect(exists).toBe(false);
    });

    it("should return true when a project is found", async () => {
      const mockProject = mockProjects[0];

      dataContext.query.mockResolvedValue({ rows: [mockProject] });

      const exists = await projectRepository.exists();

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return an empty array when no projects are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const projects = await projectRepository.findAll();

      expect(projects).toEqual([]);
    });

    it("should return projects", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockProjects.map((project) => ({
          projectId: project.id,
          projectTitle: project.title,
          projectDescription: project.description,
          projectUserId: project.userId,
          projectCreatedAt: project.createdAt,
          projectUpdatedAt: project.updatedAt,
        })),
      });

      const projects = await projectRepository.findAll();

      expect(projects).toEqual(mockProjects);
    });

    it("should return projects including documents", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockProjects.flatMap((project) => {
          const documents = mockDocuments.filter(
            (document) => document.projectId === project.id
          );

          if (!ArrayUtils.isNullOrEmpty(documents)) {
            return documents.map((document) => ({
              projectId: project.id,
              projectTitle: project.title,
              projectDescription: project.description,
              projectUserId: project.userId,
              projectCreatedAt: project.createdAt,
              projectUpdatedAt: project.updatedAt,
              documentId: document.id,
              documentKey: document.key,
              documentName: document.name,
              documentMimetype: document.mimetype,
              documentSizeInBytes: document.sizeInBytes,
              documentIsProcessed: document.isProcessed,
              documentChatId: document.chatId,
              documentProjectId: document.projectId,
              documentUserId: document.userId,
              documentCreatedAt: document.createdAt,
              documentUpdatedAt: document.updatedAt,
            }));
          }

          return [
            {
              projectId: project.id,
              projectTitle: project.title,
              projectDescription: project.description,
              projectUserId: project.userId,
              projectCreatedAt: project.createdAt,
              projectUpdatedAt: project.updatedAt,
            },
          ];
        }),
      });

      const projects = await projectRepository.findAll({
        includeDocuments: true,
      });

      expect(projects).toEqual(
        mockProjects.map((project) => ({
          ...project,
          documents: mockDocuments.filter(
            (document) => document.projectId === project.id
          ),
        }))
      );
    });
  });

  describe("findOne", () => {
    it("should return null when no project is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const project = await projectRepository.findOne();

      expect(project).toBeNull();
    });

    it("should return project", async () => {
      const mockProject = mockProjects[0];

      dataContext.query.mockResolvedValue({
        rows: [
          {
            projectId: mockProject.id,
            projectTitle: mockProject.title,
            projectDescription: mockProject.description,
            projectUserId: mockProject.userId,
            projectCreatedAt: mockProject.createdAt,
            projectUpdatedAt: mockProject.updatedAt,
          },
        ],
      });

      const project = await projectRepository.findOne();

      expect(project).toEqual(mockProject);
    });

    it("should return project including documents", async () => {
      const mockProject = mockProjects[0];

      dataContext.query.mockResolvedValue({
        rows: mockDocuments
          .filter((document) => document.projectId === mockProject.id)
          .map((document) => ({
            projectId: mockProject.id,
            projectTitle: mockProject.title,
            projectDescription: mockProject.description,
            projectUserId: mockProject.userId,
            projectCreatedAt: mockProject.createdAt,
            projectUpdatedAt: mockProject.updatedAt,
            documentId: document.id,
            documentKey: document.key,
            documentName: document.name,
            documentMimetype: document.mimetype,
            documentSizeInBytes: document.sizeInBytes,
            documentIsProcessed: document.isProcessed,
            documentChatId: document.chatId,
            documentProjectId: document.projectId,
            documentUserId: document.userId,
            documentCreatedAt: document.createdAt,
            documentUpdatedAt: document.updatedAt,
          })),
      });

      const project = await projectRepository.findOne({
        includeDocuments: true,
      });

      expect(project).toEqual({
        ...mockProject,
        documents: mockDocuments.filter(
          (document) => document.projectId === mockProject.id
        ),
      });
    });
  });
});
