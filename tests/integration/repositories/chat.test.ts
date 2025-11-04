import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { User } from "../../../src/models/entities/user";
import { ChatRepository } from "../../../src/repositories/chat";
import {
  createTestPool,
  insertChats,
  insertUsers,
  truncateChats,
  truncateUsers,
} from "../../utils";

describe("ChatRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const chatRepository = new ChatRepository(dataContext);

  let chatNumber = 0;
  const users: User[] = Array.from({ length: 3 }, (_, index) => ({
    id: randomUUID(),
    name: `user ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: "user",
    customPreferences: null,
    createdAt: addDays(new Date(), -index),
  }));
  const chats: Chat[] = users.flatMap((user, index) =>
    Array.from({ length: index < 2 ? 5 : 0 }, () => ({
      id: randomUUID(),
      title: `chat ${++chatNumber}`,
      userId: user.id,
      createdAt: addDays(new Date(), -chatNumber),
    }))
  );

  beforeAll(async () => {
    await insertUsers(users, pool);
  });

  beforeEach(async () => {
    await insertChats(chats, pool);
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
      const chat = chats[0];

      const exists = await chatRepository.exists({ id: chat.id });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all chats ordered by creation date desc", async () => {
      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        chats.sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        )
      );
    });

    it("should return an empty array when user has no chats", async () => {
      const user = users[2];

      const databaseChats = await chatRepository.findAll({ userId: user.id });

      expect(databaseChats).toEqual([]);
    });

    it("should return user chats ordered by creation date desc", async () => {
      const user = users[0];

      const databaseChats = await chatRepository.findAll({ userId: user.id });

      expect(databaseChats).toEqual(
        chats
          .filter((chat) => chat.userId === user.id)
          .sort(
            (chatA, chatB) =>
              (chatB.createdAt?.getTime() ?? 0) -
              (chatA.createdAt?.getTime() ?? 0)
          )
      );
    });
  });

  describe("findAllPaginated", () => {
    it("should return empty pagination when user has no chats", async () => {
      const user = users[2];

      const databasePaginatedUserChats = await chatRepository.findAllPaginated(
        new Date(),
        10,
        { userId: user.id }
      );

      expect(databasePaginatedUserChats).toEqual({ items: [], totalItems: 0 });
    });

    it("should return user chats ordered by creation date desc paginated", async () => {
      const user = users[0];
      const limit = 2;

      const databaseChats = await chatRepository.findAllPaginated(
        addDays(new Date(), -10),
        limit,
        { userId: user.id }
      );

      const sortedUserChats = chats
        .filter((chat) => chat.userId === user.id)
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        );

      expect(databaseChats).toEqual({
        items: sortedUserChats.slice(0, limit),
        totalItems: sortedUserChats.length,
      });
    });
  });

  describe("findOne", () => {
    it("should return null when chat does not exist", async () => {
      const databaseChat = await chatRepository.findOne({ id: randomUUID() });

      expect(databaseChat).toBeNull();
    });

    it("should return chat", async () => {
      const chat = chats[0];

      const databaseChat = await chatRepository.findOne({ id: chat.id });

      expect(databaseChat).toEqual(chat);
    });
  });

  describe("create", () => {
    it("should create a new chat", async () => {
      const user = users[0];

      const chat: Chat = {
        id: randomUUID(),
        title: "new chat",
        userId: user.id,
      };

      await chatRepository.create(chat);

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining([...chats, expect.objectContaining(chat)])
      );
    });
  });

  describe("update", () => {
    it("should update chat title", async () => {
      const targetChat = chats[0];

      await chatRepository.update(targetChat.id, { title: "chat 1 updated" });

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          chats.map((chat) =>
            chat.id === targetChat.id
              ? { ...chat, title: "chat 1 updated" }
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

      expect(databaseChats).toEqual(expect.arrayContaining(chats));
    });

    it("should delete chat", async () => {
      const targetChat = chats[0];

      await chatRepository.delete(targetChat.id);

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          chats.filter((chat) => chat.id !== targetChat.id)
        )
      );
    });
  });
});
