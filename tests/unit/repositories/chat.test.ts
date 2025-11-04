import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
import { ChatRepository } from "../../../src/repositories/chat";

describe("ChatRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let chatRepository: ChatRepository;

  let messageNumber = 0;
  const mockChats: Chat[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    title: `chat ${index + 1}`,
    userId: randomUUID(),
  }));
  const mockMessages: Message[] = mockChats.flatMap((chat) =>
    Array.from({ length: 4 }, (_, index) => ({
      id: randomUUID(),
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message ${++messageNumber}`,
      chatId: chat.id,
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
          chatUserId: chat.userId,
        })),
      });

      const chats = await chatRepository.findAll();

      expect(chats).toEqual(mockChats);
    });

    it("should return chats including messages", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockChats.flatMap((chat) => {
          const messages = mockMessages.filter(
            (message) => message.chatId === chat.id
          );

          return messages.map((message) => ({
            chatId: chat.id,
            chatTitle: chat.title,
            chatUserId: chat.userId,
            messageId: message.id,
            messageRole: message.role,
            messageContent: message.content,
            messageChatId: message.chatId,
          }));
        }),
      });

      const chats = await chatRepository.findAll({ includeMessages: true });

      expect(chats).toEqual(
        mockChats.map((chat) => ({
          ...chat,
          messages: mockMessages.filter(
            (message) => message.chatId === chat.id
          ),
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
      dataContext.query.mockResolvedValue({
        rows: mockChats.map((chat) => ({
          chatId: chat.id,
          chatTitle: chat.title,
          chatUserId: chat.userId,
          totalItems: mockChats.length,
        })),
      });

      const paginatedChats = await chatRepository.findAllPaginated(
        new Date(),
        20
      );

      expect(paginatedChats).toEqual({
        items: mockChats,
        totalItems: mockChats.length,
      });
    });

    it("should return chats paginated including messages", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockChats.flatMap((chat) => {
          const messages = mockMessages.filter(
            (message) => message.chatId === chat.id
          );

          return messages.map((message) => ({
            chatId: chat.id,
            chatTitle: chat.title,
            chatUserId: chat.userId,
            messageId: message.id,
            messageRole: message.role,
            messageContent: message.content,
            messageChatId: message.chatId,
            totalItems: mockChats.length,
          }));
        }),
      });

      const paginatedChats = await chatRepository.findAllPaginated(
        new Date(),
        20,
        { includeMessages: true }
      );

      expect(paginatedChats).toEqual({
        items: mockChats.map((chat) => ({
          ...chat,
          messages: mockMessages.filter(
            (message) => message.chatId === chat.id
          ),
        })),
        totalItems: mockChats.length,
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
            chatUserId: mockChat.userId,
          },
        ],
      });

      const chat = await chatRepository.findOne();

      expect(chat).toEqual(mockChat);
    });

    it("should return chat including messages", async () => {
      const mockChat = mockChats[0];

      dataContext.query.mockResolvedValue({
        rows: mockMessages
          .filter((message) => message.chatId === mockChat.id)
          .map((message) => ({
            chatId: mockChat.id,
            chatTitle: mockChat.title,
            chatUserId: mockChat.userId,
            messageId: message.id,
            messageRole: message.role,
            messageContent: message.content,
            messageChatId: message.chatId,
          })),
      });

      const chat = await chatRepository.findOne({ includeMessages: true });

      expect(chat).toEqual({
        ...mockChat,
        messages: mockMessages.filter(
          (message) => message.chatId === mockChat.id
        ),
      });
    });
  });
});
