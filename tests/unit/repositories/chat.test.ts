import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { Project } from "../../../src/models/entities/project";
import { ChatRepository } from "../../../src/repositories/chat";

describe("ChatRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let chatRepository: ChatRepository;

  const mockProjects: Project[] = Array.from({ length: 3 }, (_, index) => ({
    id: randomUUID(),
    title: `Project ${index + 1}`,
    description: `Project ${index + 1} Description`,
    userId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mockChats: Chat[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    title: `Chat ${index + 1}`,
    projectId: mockProjects[index]?.id ?? null,
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

    chatRepository = new ChatRepository(dataContext);
  });

  describe("exists", () => {
    it("should return false when no chat is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const exists = await chatRepository.exists();

      expect(exists).toBe(false);
    });

    it("should return true when a chat is found", async () => {
      const mockChat = mockChats[0];

      dataContext.query.mockResolvedValue({ rows: [mockChat] });

      const exists = await chatRepository.exists();

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return an empty array when no chats are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const chats = await chatRepository.findAll();

      expect(chats).toEqual([]);
    });

    it("should return chats", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockChats.map((chat) => ({
          chatId: chat.id,
          chatTitle: chat.title,
          chatProjectId: chat.projectId,
          chatUserId: chat.userId,
          chatCreatedAt: chat.createdAt,
          chatUpdatedAt: chat.updatedAt,
        })),
      });

      const chats = await chatRepository.findAll();

      expect(chats).toEqual(mockChats);
    });

    it("should return chats including project", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockChats.map((chat) => {
          if (chat.projectId != null) {
            const project = mockProjects.find(
              (project) => project.id === chat.projectId
            );

            return {
              chatId: chat.id,
              chatTitle: chat.title,
              chatProjectId: chat.projectId,
              chatUserId: chat.userId,
              chatCreatedAt: chat.createdAt,
              chatUpdatedAt: chat.updatedAt,
              projectId: project?.id,
              projectTitle: project?.title,
              projectDescription: project?.description,
              projectUserId: project?.userId,
              projectCreatedAt: project?.createdAt,
              projectUpdatedAt: project?.updatedAt,
            };
          }

          return {
            chatId: chat.id,
            chatTitle: chat.title,
            chatProjectId: chat.projectId,
            chatUserId: chat.userId,
            chatCreatedAt: chat.createdAt,
            chatUpdatedAt: chat.updatedAt,
          };
        }),
      });

      const chats = await chatRepository.findAll({ includeProject: true });

      expect(chats).toEqual(
        mockChats.map((chat) => ({
          ...chat,
          project:
            chat.projectId != null
              ? mockProjects.find((project) => project.id === chat.projectId)
              : null,
        }))
      );
    });
  });

  describe("findAllPaginated", () => {
    it("should return an empty pagination when no chats are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const paginatedChats = await chatRepository.findAllPaginated(
        new Date(),
        20
      );

      expect(paginatedChats).toEqual({ items: [], totalItems: 0 });
    });

    it("should return chats paginated", async () => {
      const cursor = new Date();
      const limit = 5;

      dataContext.query.mockResolvedValue({
        rows: mockChats.slice(0, limit + 1).map((chat) => ({
          chatId: chat.id,
          chatTitle: chat.title,
          chatProjectId: chat.projectId,
          chatUserId: chat.userId,
          chatCreatedAt: chat.createdAt,
          chatUpdatedAt: chat.updatedAt,
          totalItems: mockChats.length,
        })),
      });

      const paginatedChats = await chatRepository.findAllPaginated(
        cursor,
        limit
      );

      expect(paginatedChats).toEqual({
        items: mockChats.slice(0, limit),
        totalItems: mockChats.length,
        nextCursor: mockChats[limit]?.createdAt,
      });
    });

    it("should return chats paginated including project", async () => {
      const cursor = new Date();
      const limit = 5;

      dataContext.query.mockResolvedValue({
        rows: mockChats.slice(0, limit + 1).map((chat) => {
          if (chat.projectId != null) {
            const project = mockProjects.find(
              (project) => project.id === chat.projectId
            );

            return {
              chatId: chat.id,
              chatTitle: chat.title,
              chatProjectId: chat.projectId,
              chatUserId: chat.userId,
              chatCreatedAt: chat.createdAt,
              chatUpdatedAt: chat.updatedAt,
              projectId: project?.id,
              projectTitle: project?.title,
              projectDescription: project?.description,
              projectUserId: project?.userId,
              projectCreatedAt: project?.createdAt,
              projectUpdatedAt: project?.updatedAt,
              totalItems: mockChats.length,
            };
          }

          return {
            chatId: chat.id,
            chatTitle: chat.title,
            chatProjectId: chat.projectId,
            chatUserId: chat.userId,
            chatCreatedAt: chat.createdAt,
            chatUpdatedAt: chat.updatedAt,
            totalItems: mockChats.length,
          };
        }),
      });

      const paginatedChats = await chatRepository.findAllPaginated(
        cursor,
        limit,
        { includeProject: true }
      );

      expect(paginatedChats).toEqual({
        items: mockChats.slice(0, limit).map((chat) => ({
          ...chat,
          project:
            chat.projectId != null
              ? mockProjects.find((project) => project.id === chat.projectId)
              : null,
        })),
        totalItems: mockChats.length,
        nextCursor: mockChats[limit]?.createdAt,
      });
    });
  });

  describe("findOne", () => {
    it("should return null when no chat is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const chat = await chatRepository.findOne();

      expect(chat).toBeNull();
    });

    it("should return chat", async () => {
      const mockChat = mockChats[0];

      dataContext.query.mockResolvedValue({
        rows: [
          {
            chatId: mockChat.id,
            chatTitle: mockChat.title,
            chatProjectId: mockChat.projectId,
            chatUserId: mockChat.userId,
            chatCreatedAt: mockChat.createdAt,
            chatUpdatedAt: mockChat.updatedAt,
          },
        ],
      });

      const chat = await chatRepository.findOne();

      expect(chat).toEqual(mockChat);
    });

    it("should return chat including project", async () => {
      const mockChat = mockChats.find((chat) => chat.projectId != null)!;
      const mockProject = mockProjects.find(
        (project) => project.id === mockChat.projectId
      )!;

      dataContext.query.mockResolvedValue({
        rows: [
          {
            chatId: mockChat.id,
            chatTitle: mockChat.title,
            chatProjectId: mockChat.projectId,
            chatUserId: mockChat.userId,
            chatCreatedAt: mockChat.createdAt,
            chatUpdatedAt: mockChat.updatedAt,
            projectId: mockProject.id,
            projectTitle: mockProject.title,
            projectDescription: mockProject.description,
            projectUserId: mockProject.userId,
            projectCreatedAt: mockProject.createdAt,
            projectUpdatedAt: mockProject.updatedAt,
          },
        ],
      });

      const chat = await chatRepository.findOne({ includeProject: true });

      expect(chat).toEqual({ ...mockChat, project: mockProject });
    });
  });
});
