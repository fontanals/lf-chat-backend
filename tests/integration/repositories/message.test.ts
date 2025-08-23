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
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -6),
    },
    {
      id: randomUUID(),
      name: "user 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -5),
    },
  ];
  const chats: Chat[] = [
    {
      id: randomUUID(),
      title: "user 1 chat",
      userId: users[0].id,
      createdAt: addDays(new Date(), -1),
    },
    {
      id: randomUUID(),
      title: "user 2 chat",
      userId: users[1].id,
      createdAt: addDays(new Date(), -2),
    },
  ];
  const messages: Message[] = [
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -1),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -1),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -2),
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

      expect(databaseMessages).toEqual(
        messages
          .sort(
            (messageA, messageB) =>
              (messageA.createdAt?.getTime() ?? 0) -
              (messageB.createdAt?.getTime() ?? 0)
          )
          .map((message) => expect.objectContaining(message))
      );
    });

    it("should return chat messages ordered by creation date asc", async () => {
      const chatId = chats[0].id;

      const databaseMessages = await messageRepository.findAll({ chatId });

      expect(databaseMessages).toEqual(
        messages
          .filter((message) => message.chatId === chatId)
          .sort(
            (messageA, messageB) =>
              (messageA.createdAt?.getTime() ?? 0) -
              (messageB.createdAt?.getTime() ?? 0)
          )
          .map((message) => expect.objectContaining(message))
      );
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

      expect(databaseMessages).toEqual(
        expect.arrayContaining(
          [...messages, message].map((message) =>
            expect.objectContaining(message)
          )
        )
      );
    });
  });
});
