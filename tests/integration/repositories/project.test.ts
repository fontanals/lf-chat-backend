import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { Document } from "../../../src/models/entities/document";
import { Project } from "../../../src/models/entities/project";
import { User } from "../../../src/models/entities/user";
import { ProjectRepository } from "../../../src/repositories/project";
import {
  createTestPool,
  insertDocuments,
  insertProjects,
  insertUsers,
  truncateProjects,
  truncateUsers,
} from "../../utils";

describe("ProjectRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const projectRepository = new ProjectRepository(dataContext);

  const mockUsers: User[] = Array.from({ length: 6 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mockProjects: Project[] = mockUsers.slice(0, 4).map((user, index) => ({
    id: randomUUID(),
    title: `Project ${index + 1}`,
    description: `Project ${index + 1} Description`,
    userId: user.id,
    createdAt: addDays(new Date(), -index),
    updatedAt: addDays(new Date(), -index),
  }));

  let documentNumber = 0;
  const mockDocuments: Document[] = mockProjects
    .slice(0, 2)
    .flatMap((project) =>
      Array.from({ length: 3 }, () => ({
        id: randomUUID(),
        key: randomUUID(),
        name: `Document ${++documentNumber}`,
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
    await pool.end();
  });

  describe("exists", () => {
    it("should return false when project does not exist", async () => {
      const exists = await projectRepository.exists({ id: randomUUID() });

      expect(exists).toBe(false);
    });

    it("should return true when project exists", async () => {
      const mockProject = mockProjects[0];

      const exists = await projectRepository.exists({ id: mockProject.id });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all projects ordered by creation date desc", async () => {
      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(
        [...mockProjects].sort(
          (projectA, projectB) =>
            projectB.createdAt!.getTime() - projectA.createdAt!.getTime()
        )
      );
    });

    it("should return an empty array when user has no projects", async () => {
      const mockUser = mockUsers[5];

      const databaseUserProjects = await projectRepository.findAll({
        userId: mockUser.id,
      });

      expect(databaseUserProjects).toEqual([]);
    });

    it("should return user projects order by creation date desc", async () => {
      const mockUser = mockUsers[0];

      const databaseUserProjects = await projectRepository.findAll({
        userId: mockUser.id,
      });

      expect(databaseUserProjects).toEqual(
        mockProjects
          .filter((project) => project.userId === mockUser.id)
          .sort(
            (projectA, projectB) =>
              projectB.createdAt!.getTime() - projectA.createdAt!.getTime()
          )
      );
    });

    it("should return user projects order by creation date desc including documents", async () => {
      const mockUser = mockUsers[0];

      const databaseUserProjects = await projectRepository.findAll({
        userId: mockUser.id,
        includeDocuments: true,
      });

      expect(databaseUserProjects).toEqual(
        mockProjects
          .filter((project) => project.userId === mockUser.id)
          .map((project) => ({
            ...project,
            documents: mockDocuments.filter(
              (document) => document.projectId === project.id
            ),
          }))
      );
    });
  });

  describe("findOne", () => {
    it("should return null when project does not exist", async () => {
      const databaseProject = await projectRepository.findOne({
        id: randomUUID(),
      });

      expect(databaseProject).toBeNull();
    });

    it("should return project", async () => {
      const mockProject = mockProjects[0];

      const databaseProject = await projectRepository.findOne({
        id: mockProject.id,
      });

      expect(databaseProject).toEqual(mockProject);
    });

    it("should return project including documents", async () => {
      const mockProject = mockProjects[0];

      const databaseProject = await projectRepository.findOne({
        id: mockProject.id,
        includeDocuments: true,
      });

      expect(databaseProject).toEqual({
        ...mockProject,
        documents: mockDocuments.filter(
          (document) => document.projectId === mockProject.id
        ),
      });
    });
  });

  describe("create", () => {
    it("should create a new project", async () => {
      const mockUser = mockUsers[0];

      const newProject: Project = {
        id: randomUUID(),
        title: "New Project",
        description: "New Project Description",
        userId: mockUser.id,
      };

      await projectRepository.create(newProject);

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(
        expect.arrayContaining([
          ...mockProjects,
          {
            ...newProject,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );
    });
  });

  describe("update", () => {
    it("should not update project when it does not exist", async () => {
      await projectRepository.update(randomUUID(), {
        title: "Updated Project Title",
      });

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(expect.arrayContaining(mockProjects));
    });

    it("should update project title and description", async () => {
      const mockProject = mockProjects[0];

      await projectRepository.update(mockProject.id, {
        title: "Project Title Updated",
        description: "Project Description Updated",
      });

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(
        expect.arrayContaining(
          mockProjects.map((project) =>
            project.id === mockProject.id
              ? {
                  ...project,
                  title: "Project Title Updated",
                  description: "Project Description Updated",
                  updatedAt: expect.any(Date),
                }
              : project
          )
        )
      );
    });
  });

  describe("delete", () => {
    it("should not delete project when it does not exist", async () => {
      await projectRepository.delete(randomUUID());

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(expect.arrayContaining(mockProjects));
    });

    it("should delete project", async () => {
      const mockProject = mockProjects[0];

      await projectRepository.delete(mockProject.id);

      const databaseProjects = await projectRepository.findAll();

      expect(databaseProjects).toEqual(
        expect.arrayContaining(
          mockProjects.filter((project) => project.id !== mockProject.id)
        )
      );
    });
  });
});
