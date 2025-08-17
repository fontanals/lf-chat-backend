import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/context";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
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

  const users: User[] = [
    {
      id: randomUUID(),
      name: "User 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -50),
    },
    {
      id: randomUUID(),
      name: "User 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -102),
    },
  ];
  const chats: Chat[] = [
    {
      id: randomUUID(),
      title: "User 1 Chat",
      userId: users[0].id,
      createdAt: addDays(new Date(), -1),
    },
    {
      id: randomUUID(),
      title: "User 2 Chat",
      userId: users[0].id,
      createdAt: addDays(new Date(), -2),
    },
  ];
  const messages: Message[] = [
    { id: randomUUID(), role: "user", content: "Hello", chatId: chats[0].id },
    {
      id: randomUUID(),
      role: "assistant",
      content: "Hi there! How can I help you today?",
      chatId: chats[0].id,
    },
    {
      id: randomUUID(),
      role: "user",
      content: "How are you?",
      chatId: chats[1].id,
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "I'm very well, thank you! How can I help you today?",
      chatId: chats[1].id,
    },
  ];

  beforeAll(async () => {
    await insertUsers(users, pool);
    await insertChats(chats, pool);
  });

  beforeEach(async () => {
    await insertMessages(messages, pool);
  });

  afterEach(async () => {
    await truncateMessages(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("findAll", () => {
    it("should return all messages ordered by creation date asc", async () => {
      const databaseMessages = await messageRepository.findAll();

      const expectedMessages = messages
        .sort(
          (messageA, messageB) =>
            (messageA.createdAt?.getTime() ?? 0) -
            (messageB.createdAt?.getTime() ?? 0)
        )
        .map((message) => expect.objectContaining(message));

      expect(databaseMessages).toEqual(expectedMessages);
    });

    it("should return all chat messages ordered by creation date asc", async () => {
      const chatId = chats[0].id;

      const databaseMessages = await messageRepository.findAll({ chatId });

      const expectedMessages = messages
        .filter((message) => message.chatId === chatId)
        .sort(
          (messageA, messageB) =>
            (messageA.createdAt?.getTime() ?? 0) -
            (messageB.createdAt?.getTime() ?? 0)
        )
        .map((message) => expect.objectContaining(message));

      expect(databaseMessages).toEqual(expectedMessages);
    });
  });

  describe("create", () => {
    it("should create a new message", async () => {
      const chatId = chats[0].id;

      const message: Message = {
        id: randomUUID(),
        role: "user",
        content: "message",
        chatId,
      };

      await messageRepository.create(message);

      const databaseMessages = await messageRepository.findAll();

      const expectedMessages = expect.arrayContaining(
        [...messages, message].map((message) =>
          expect.objectContaining(message)
        )
      );

      expect(databaseMessages).toEqual(expectedMessages);
    });
  });
});
