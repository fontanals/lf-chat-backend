import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { Document } from "../../../src/models/entities/document";
import { Project } from "../../../src/models/entities/project";
import { User } from "../../../src/models/entities/user";
import { DocumentRepository } from "../../../src/repositories/document";
import {
  createTestPool,
  insertChats,
  insertDocuments,
  insertProjects,
  insertUsers,
  truncateDocuments,
  truncateUsers,
} from "../../utils";

describe("DocumentRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const documentRepository = new DocumentRepository(dataContext);

  const mockUsers: User[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

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

  let chatNumber = 0;
  const mockChats: Chat[] = [
    ...mockUsers.flatMap((user) =>
      Array.from({ length: 5 }, () => ({
        id: randomUUID(),
        title: `Chat ${++chatNumber}`,
        projectId: null,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    ),
    ...mockProjects.flatMap((project) =>
      Array.from({ length: 5 }, () => ({
        id: randomUUID(),
        title: `Chat ${++chatNumber}`,
        projectId: project.id,
        userId: project.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    ),
  ];

  let documentNumber = 0;
  const mockDocuments: Document[] = [
    ...mockProjects.map((project) => ({
      id: randomUUID(),
      key: randomUUID(),
      name: `Document ${++documentNumber}`,
      mimetype: "text/plain",
      sizeInBytes: 1024,
      isProcessed: false,
      chatId: null,
      projectId: project.id,
      userId: project.userId,
      createdAt: addDays(new Date(), -100 + documentNumber),
      updatedAt: addDays(new Date(), -100 + documentNumber),
    })),
    ...mockChats.map((chat) => ({
      id: randomUUID(),
      key: randomUUID(),
      name: `Document ${++documentNumber}`,
      mimetype: "text/plain",
      sizeInBytes: 1024,
      isProcessed: false,
      chatId: chat.id,
      projectId: null,
      userId: chat.userId,
      createdAt: addDays(new Date(), -100 + documentNumber),
      updatedAt: addDays(new Date(), -100 + documentNumber),
    })),
  ];

  beforeAll(async () => {
    await insertUsers(mockUsers, pool);
    await insertProjects(mockProjects, pool);
    await insertChats(mockChats, pool);
  });

  beforeEach(async () => {
    await insertDocuments(mockDocuments, pool);
  });

  afterEach(async () => {
    await truncateDocuments(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("count", () => {
    it("should return the total number of documents", async () => {
      const count = await documentRepository.count();

      expect(count).toBe(mockDocuments.length);
    });

    it("should return the total number of documents of a user", async () => {
      const mockUser = mockUsers[0];

      const count = await documentRepository.count({ userId: mockUser.id });

      expect(count).toBe(
        mockDocuments.filter((document) => document.userId === mockUser.id)
          .length
      );
    });
  });

  describe("exists", () => {
    it("should return false when document does not exist", async () => {
      const exists = await documentRepository.exists({ id: randomUUID() });

      expect(exists).toBe(false);
    });

    it("should return true when document exists", async () => {
      const mockDocument = mockDocuments[0];

      const exists = await documentRepository.exists({ id: mockDocument.id });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all documents sorted by creation date", async () => {
      const databaseDocuments = await documentRepository.findAll();

      expect(databaseDocuments).toEqual(mockDocuments);
    });

    it("should return chat documents sorted by creation date", async () => {
      const mockChat = mockChats[0];

      const databaseDocuments = await documentRepository.findAll({
        chatId: mockChat.id,
      });

      expect(databaseDocuments).toEqual(
        mockDocuments.filter((document) => document.chatId === mockChat.id)
      );
    });

    it("should return project documents sorted by creation date", async () => {
      const mockProject = mockProjects[0];

      const databaseDocuments = await documentRepository.findAll({
        projectId: mockProject.id,
      });

      expect(databaseDocuments).toEqual(
        mockDocuments.filter(
          (document) => document.projectId === mockProject.id
        )
      );
    });
  });

  describe("findOne", () => {
    it("should return null when document does not exist", async () => {
      const databaseDocument = await documentRepository.findOne({
        id: randomUUID(),
      });

      expect(databaseDocument).toBeNull();
    });

    it("should return document", async () => {
      const mockDocument = mockDocuments[0];

      const databaseDocument = await documentRepository.findOne({
        id: mockDocument.id,
      });

      expect(databaseDocument).toEqual(mockDocument);
    });
  });

  describe("create", () => {
    it("should create a new document", async () => {
      const mockUser = mockUsers[0];

      const newDocument: Document = {
        id: randomUUID(),
        key: randomUUID(),
        name: `New Document`,
        mimetype: "text/plain",
        sizeInBytes: 1024,
        isProcessed: true,
        chatId: null,
        projectId: null,
        userId: mockUser.id,
      };

      await documentRepository.create(newDocument);

      const databaseUsers = await documentRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining([
          ...mockDocuments,
          {
            ...newDocument,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );
    });
  });

  describe("update", () => {
    it("should not update document when it does not exist", async () => {
      await documentRepository.update(randomUUID(), { isProcessed: true });

      const databaseDocuments = await documentRepository.findAll();

      expect(databaseDocuments).toEqual(mockDocuments);
    });

    it("should update document is processed flag", async () => {
      const mockDocument = mockDocuments[0];

      await documentRepository.update(mockDocument.id, {
        isProcessed: true,
      });

      const databaseDocuments = await documentRepository.findAll();

      expect(databaseDocuments).toEqual(
        expect.arrayContaining(
          mockDocuments.map((document) =>
            document.id === mockDocument.id
              ? { ...document, isProcessed: true, updatedAt: expect.any(Date) }
              : document
          )
        )
      );
    });
  });

  describe("delete", () => {
    it("should not delete document when it does not exist", async () => {
      await documentRepository.delete(randomUUID());

      const databaseDocuments = await documentRepository.findAll();

      expect(databaseDocuments).toEqual(mockDocuments);
    });

    it("should delete document", async () => {
      const mockDocument = mockDocuments[0];

      await documentRepository.delete(mockDocument.id);

      const databaseDocuments = await documentRepository.findAll();

      expect(databaseDocuments).toEqual(
        expect.arrayContaining(
          mockDocuments.filter((document) => document.id !== mockDocument.id)
        )
      );
    });
  });

  describe("getChatContextDocuments", () => {
    it("should return chat and project documents sorted by creation date", async () => {
      const mockChat = mockChats[25];

      const databaseDocuments =
        await documentRepository.getChatContextDocuments(
          { ids: [], chatId: mockChat.id, projectId: mockChat.projectId },
          mockChat.userId
        );

      expect(databaseDocuments).toEqual(
        mockDocuments.filter(
          (document) =>
            document.chatId === mockChat.id ||
            document.projectId === mockChat.projectId
        )
      );
    });
  });

  describe("getAllUserChatDocuments", () => {
    it("should return all user chat documents sorted by creation date", async () => {
      const mockUser = mockUsers[0];

      const databaseDocuments =
        await documentRepository.getAllUserChatDocuments(mockUser.id);

      const mockUserChats = new Set(
        mockChats
          .filter((chat) => chat.userId === mockUser.id)
          .map((chat) => chat.id)
      );

      expect(databaseDocuments).toEqual(
        mockDocuments.filter(
          (document) =>
            document.chatId != null && mockUserChats.has(document.chatId)
        )
      );
    });
  });
});
