import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { Project } from "../../../src/models/entities/project";
import { User } from "../../../src/models/entities/user";
import { ChatRepository } from "../../../src/repositories/chat";
import {
  createTestPool,
  insertChats,
  insertProjects,
  insertUsers,
  truncateChats,
  truncateUsers,
} from "../../utils";

describe("ChatRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const chatRepository = new ChatRepository(dataContext);

  const mockUsers: User[] = Array.from({ length: 6 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mockProjects: Project[] = mockUsers.slice(0, 2).map((user, index) => ({
    id: randomUUID(),
    title: `Project ${index + 1}`,
    description: `Project ${index + 1} Description`,
    userId: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  let chatNumber = 0;
  const mockChats: Chat[] = [
    ...mockUsers.slice(0, 4).flatMap((user) =>
      Array.from({ length: 5 }, () => ({
        id: randomUUID(),
        title: `Chat ${++chatNumber}`,
        projectId: null,
        userId: user.id,
        createdAt: addDays(new Date(), -chatNumber),
        updatedAt: addDays(new Date(), -chatNumber),
      }))
    ),
    ...mockProjects.flatMap((project) =>
      Array.from({ length: 3 }, () => ({
        id: randomUUID(),
        title: `Chat ${++chatNumber}`,
        projectId: project.id,
        userId: project.userId,
        createdAt: addDays(new Date(), -chatNumber),
        updatedAt: addDays(new Date(), -chatNumber),
      }))
    ),
  ];

  beforeAll(async () => {
    await insertUsers(mockUsers, pool);
    await insertProjects(mockProjects, pool);
  });

  beforeEach(async () => {
    await insertChats(mockChats, pool);
  });

  afterEach(async () => {
    await truncateChats(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("exists", () => {
    it("should return false when chat does not exist", async () => {
      const exists = await chatRepository.exists({ id: randomUUID() });

      expect(exists).toBe(false);
    });

    it("should return true when chat exists", async () => {
      const mockChat = mockChats[0];

      const exists = await chatRepository.exists({ id: mockChat.id });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all chats ordered by creation date desc", async () => {
      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        [...mockChats].sort(
          (chatA, chatB) =>
            chatB.createdAt!.getTime() - chatA.createdAt!.getTime()
        )
      );
    });

    it("should return an empty array when user has no chats", async () => {
      const mockUser = mockUsers[4];

      const databaseChats = await chatRepository.findAll({
        userId: mockUser.id,
      });

      expect(databaseChats).toEqual([]);
    });

    it("should return user chats ordered by creation date desc", async () => {
      const mockUser = mockUsers[0];

      const databaseChats = await chatRepository.findAll({
        userId: mockUser.id,
      });

      expect(databaseChats).toEqual(
        mockChats
          .filter((chat) => chat.userId === mockUser.id)
          .sort(
            (chatA, chatB) =>
              chatB.createdAt!.getTime() - chatA.createdAt!.getTime()
          )
      );
    });

    it("should return project chats ordered by creation date desc", async () => {
      const mockProject = mockProjects[0];

      const databaseChats = await chatRepository.findAll({
        projectId: mockProject.id,
      });

      expect(databaseChats).toEqual(
        mockChats
          .filter((chat) => chat.projectId === mockProject.id)
          .sort(
            (chatA, chatB) =>
              chatB.createdAt!.getTime() - chatA.createdAt!.getTime()
          )
      );
    });
  });

  describe("findAllPaginated", () => {
    it("should return empty pagination when user has no chats", async () => {
      const mockUser = mockUsers[4];

      const databaseUserPaginatedChats = await chatRepository.findAllPaginated(
        new Date(),
        25,
        { userId: mockUser.id }
      );

      expect(databaseUserPaginatedChats).toEqual({ items: [], totalItems: 0 });
    });

    it("should return user chats ordered by creation date desc paginated", async () => {
      const mockUser = mockUsers[0];

      const cursor = new Date();
      const limit = 2;

      const databaseChats = await chatRepository.findAllPaginated(
        cursor,
        limit,
        { userId: mockUser.id }
      );

      const sortedUserChats = mockChats
        .filter((chat) => chat.userId === mockUser.id)
        .sort(
          (chatA, chatB) =>
            chatB.createdAt!.getTime() - chatA.createdAt!.getTime()
        );

      expect(databaseChats).toEqual({
        items: sortedUserChats.slice(0, limit),
        totalItems: sortedUserChats.length,
        nextCursor: sortedUserChats[limit]?.createdAt,
      });
    });

    it("should return project chats ordered by creation date desc paginated", async () => {
      const mockProject = mockProjects[0];

      const cursor = new Date();
      const limit = 2;

      const databaseChats = await chatRepository.findAllPaginated(
        cursor,
        limit,
        { projectId: mockProject.id }
      );

      const sortedProjectChats = mockChats
        .filter((chat) => chat.projectId === mockProject.id)
        .sort(
          (chatA, chatB) =>
            chatB.createdAt!.getTime() - chatA.createdAt!.getTime()
        );

      expect(databaseChats).toEqual({
        items: sortedProjectChats.slice(0, limit),
        totalItems: sortedProjectChats.length,
        nextCursor: sortedProjectChats[limit]?.createdAt,
      });
    });
  });

  describe("findOne", () => {
    it("should return null when chat does not exist", async () => {
      const databaseChat = await chatRepository.findOne({ id: randomUUID() });

      expect(databaseChat).toBeNull();
    });

    it("should return chat", async () => {
      const mockChat = mockChats[0];

      const databaseChat = await chatRepository.findOne({ id: mockChat.id });

      expect(databaseChat).toEqual(mockChat);
    });
  });

  describe("create", () => {
    it("should create a new chat", async () => {
      const mockUser = mockUsers[0];

      const chat: Chat = {
        id: randomUUID(),
        title: "New Chat",
        projectId: null,
        userId: mockUser.id,
      };

      await chatRepository.create(chat);

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining([
          ...mockChats,
          { ...chat, createdAt: expect.any(Date), updatedAt: expect.any(Date) },
        ])
      );
    });
  });

  describe("update", () => {
    it("should update chat title", async () => {
      const mockChat = mockChats[0];

      await chatRepository.update(mockChat.id, {
        title: "Chat Title Updated",
      });

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          mockChats.map((chat) =>
            chat.id === mockChat.id
              ? {
                  ...chat,
                  title: "Chat Title Updated",
                  updatedAt: expect.any(Date),
                }
              : chat
          )
        )
      );
    });
  });

  describe("delete", () => {
    it("should not delete chat when it does not exist", async () => {
      await chatRepository.delete(randomUUID());

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(expect.arrayContaining(mockChats));
    });

    it("should delete chat", async () => {
      const mockChat = mockChats[0];

      await chatRepository.delete(mockChat.id);

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          mockChats.filter((chat) => chat.id !== mockChat.id)
        )
      );
    });
  });
});
