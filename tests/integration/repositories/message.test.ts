import { randomUUID } from "crypto";
import { addDays, addSeconds } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { Message, UserMessage } from "../../../src/models/entities/message";
import { User } from "../../../src/models/entities/user";
import { MessageRepository } from "../../../src/repositories/message";
import {
  createTestPool,
  insertChats,
  insertMessages,
  insertUsers,
  truncateMessages,
  truncateUsers,
} from "../../utils";

describe("MessageRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const messageRepository = new MessageRepository(dataContext);

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

  const mockChats: Chat[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    title: `Chat ${index + 1}`,
    projectId: null,
    userId: mockUser.id,
    createdAt: addDays(new Date(), -index),
    updatedAt: addDays(new Date(), -index),
  }));

  const mockMessages: Message[] = mockChats.flatMap((chat) => {
    const userMessageId = randomUUID();

    return [
      {
        id: userMessageId,
        role: "user",
        content: [{ type: "text", id: randomUUID(), text: "User Message" }],
        feedback: null,
        finishReason: null,
        parentMessageId: null,
        chatId: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
      {
        id: randomUUID(),
        role: "assistant",
        content: [
          { type: "text", id: randomUUID(), text: "Assistant Message" },
        ],
        feedback: null,
        finishReason: "stop",
        parentMessageId: userMessageId,
        chatId: chat.id,
        createdAt: addSeconds(chat.createdAt!, 10),
        updatedAt: addSeconds(chat.createdAt!, 10),
      },
    ];
  });

  beforeAll(async () => {
    await insertUsers([mockUser], pool);
    await insertChats(mockChats, pool);
  });

  beforeEach(async () => {
    await insertMessages(mockMessages, pool);
  });

  afterEach(async () => {
    await truncateMessages(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("exists", () => {
    it("should return false when message does not exist", async () => {
      const exists = await messageRepository.exists({ id: randomUUID() });

      expect(exists).toBe(false);
    });

    it("should return true when message exists", async () => {
      const mockMessage = mockMessages[0];

      const exists = await messageRepository.exists({ id: mockMessage.id });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all messages ordered by creation date asc", async () => {
      const databaseMessages = await messageRepository.findAll();

      expect(databaseMessages).toEqual(
        [...mockMessages].sort(
          (messageA, messageB) =>
            messageA.createdAt!.getTime() - messageB.createdAt!.getTime()
        )
      );
    });

    it("should return chat messages ordered by creation date asc", async () => {
      const mockChat = mockChats[0];

      const databaseMessages = await messageRepository.findAll({
        chatId: mockChat.id,
      });

      expect(databaseMessages).toEqual(
        mockMessages
          .filter((message) => message.chatId === mockChat.id)
          .sort(
            (messageA, messageB) =>
              messageA.createdAt!.getTime() - messageB.createdAt!.getTime()
          )
      );
    });
  });

  describe("create", () => {
    it("should create a new message", async () => {
      const mockChat = mockChats[0];

      const newMessage: UserMessage = {
        id: randomUUID(),
        role: "user",
        content: [{ type: "text", id: randomUUID(), text: "New User Message" }],
        feedback: null,
        finishReason: null,
        parentMessageId: null,
        chatId: mockChat.id,
      };

      await messageRepository.create(newMessage);

      const databaseMessages = await messageRepository.findAll();

      expect(databaseMessages).toEqual(
        expect.arrayContaining([
          ...mockMessages,
          {
            ...newMessage,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );
    });
  });

  describe("update", () => {
    it("should not update message when it does not exist", async () => {
      await messageRepository.update(randomUUID(), { feedback: "like" });

      const databaseMessages = await messageRepository.findAll();

      expect(databaseMessages).toEqual(expect.arrayContaining(mockMessages));
    });

    it("should update message feedback", async () => {
      const mockMessage = mockMessages[0];

      await messageRepository.update(mockMessage.id, { feedback: "dislike" });

      const databaseMessages = await messageRepository.findAll();

      expect(databaseMessages).toEqual(
        expect.arrayContaining(
          mockMessages.map((message) =>
            message.id === mockMessage.id
              ? { ...message, feedback: "dislike", updatedAt: expect.any(Date) }
              : message
          )
        )
      );
    });
  });
});
