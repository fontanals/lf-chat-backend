import { randomUUID } from "crypto";
import { addDays, addSeconds } from "date-fns";
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

  let chatNumber = 0;
  let messageNumber = 0;
  const users: User[] = Array.from({ length: 2 }, (_, index) => ({
    id: randomUUID(),
    name: `user ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: "user",
    customPreferences: null,
    createdAt: addDays(new Date(), -index - 25),
  }));
  const chats: Chat[] = users.flatMap((user) =>
    Array.from({ length: 5 }, () => ({
      id: randomUUID(),
      title: `chat ${++chatNumber}`,
      userId: user.id,
      createdAt: addDays(user.createdAt!, -chatNumber),
    }))
  );
  const messages: Message[] = chats.flatMap((chat) =>
    Array.from({ length: 4 }, (_, index) => ({
      id: randomUUID(),
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message ${++messageNumber}`,
      chatId: chat.id,
      createdAt: addSeconds(chat.createdAt!, messageNumber * 10),
    }))
  );

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
        messages.sort(
          (messageA, messageB) =>
            (messageA.createdAt?.getTime() ?? 0) -
            (messageB.createdAt?.getTime() ?? 0)
        )
      );
    });

    it("should return chat messages ordered by creation date asc", async () => {
      const chat = chats[0];

      const databaseMessages = await messageRepository.findAll({
        chatId: chat.id,
      });

      expect(databaseMessages).toEqual(
        messages
          .filter((message) => message.chatId === chat.id)
          .sort(
            (messageA, messageB) =>
              (messageA.createdAt?.getTime() ?? 0) -
              (messageB.createdAt?.getTime() ?? 0)
          )
      );
    });
  });

  describe("create", () => {
    it("should create a new message", async () => {
      const chat = chats[0];

      const message: Message = {
        id: randomUUID(),
        role: "user",
        content: "new message",
        chatId: chat.id,
      };

      await messageRepository.create(message);

      const databaseMessages = await messageRepository.findAll();

      expect(databaseMessages).toEqual(
        expect.arrayContaining([
          ...messages.sort(
            (messageA, messageB) =>
              (messageA.createdAt?.getTime() ?? 0) -
              (messageB.createdAt?.getTime() ?? 0)
          ),
          expect.objectContaining(message),
        ])
      );
    });
  });
});
