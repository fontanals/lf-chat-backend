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

      const result = await chatRepository.exists();

      expect(result).toBe(false);
    });

    it("should return true when a chat is found", async () => {
      const chat: Chat = {
        id: "chat-id",
        title: "Chat Name",
        userId: "user-id",
      };

      dataContext.query.mockResolvedValue({ rows: [chat] });

      const result = await chatRepository.exists();

      expect(result).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return an empty array when no chats are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const result = await chatRepository.findAll();

      expect(result).toEqual([]);
    });

    it("should return chats", async () => {
      const chats: Chat[] = [
        { id: "chat-1", title: "Chat 1", userId: "user-id" },
        { id: "chat-2", title: "Chat 2", userId: "user-id" },
      ];

      dataContext.query.mockResolvedValue({ rows: chats });

      const result = await chatRepository.findAll({ userId: "user-id" });

      expect(result).toEqual(chats);
    });
  });
});
