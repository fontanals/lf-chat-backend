import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/context";
import { Chat } from "../../../src/models/entities/chat";
import { ChatRepository } from "../../../src/repositories/chat";

describe("ChatRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let chatRepository: ChatRepository;

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
      const mockChat: Chat = {
        id: randomUUID(),
        title: "title",
        userId: randomUUID(),
      };

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

    it("should return chats when chats are", async () => {
      const mockChats: Chat[] = [
        { id: randomUUID(), title: "title", userId: randomUUID() },
        { id: randomUUID(), title: "title", userId: randomUUID() },
      ];

      dataContext.query.mockResolvedValue({ rows: mockChats });

      const chats = await chatRepository.findAll();

      expect(chats).toEqual(mockChats);
    });
  });

  describe("findAllPaginated", () => {
    it("should return an empty pagination when no chats are found", async () => {
      const page = 1;
      const pageSize = 10;

      dataContext.query.mockResolvedValue({ rows: [] });

      const pagination = await chatRepository.findAllPaginated(page, pageSize);

      expect(pagination).toEqual({
        items: [],
        totalItems: 0,
        page,
        pageSize,
        totalPages: 1,
      });
    });

    it("should return paginated chats", async () => {
      const page = 1;
      const pageSize = 10;

      const mockChats: (Chat & { totalItems: number })[] = [
        {
          id: randomUUID(),
          title: "title",
          userId: randomUUID(),
          totalItems: 2,
        },
        {
          id: randomUUID(),
          title: "title",
          userId: randomUUID(),
          totalItems: 2,
        },
      ];

      dataContext.query.mockResolvedValue({ rows: mockChats });

      const pagination = await chatRepository.findAllPaginated(page, pageSize);

      expect(pagination).toEqual({
        items: mockChats,
        totalItems: mockChats.length,
        page,
        pageSize,
        totalPages: 1,
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
      const mockChat: Chat = {
        id: randomUUID(),
        title: "title",
        userId: randomUUID(),
      };

      dataContext.query.mockResolvedValue({ rows: [mockChat] });

      const chat = await chatRepository.findOne();

      expect(chat).toEqual(mockChat);
    });
  });
});
