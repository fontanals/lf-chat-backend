import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/context";
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

  const users: User[] = [
    {
      id: randomUUID(),
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -14),
    },
    {
      id: randomUUID(),
      name: "user 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -16),
    },
    {
      id: randomUUID(),
      name: "user 3",
      email: "user3@example.com",
      password: "password",
      createdAt: addDays(new Date(), -13),
    },
  ];
  const chats: Chat[] = [
    {
      id: randomUUID(),
      title: "user 1 chat 1",
      userId: users[0].id,
      createdAt: addDays(new Date(), -1),
    },
    {
      id: randomUUID(),
      title: "user 1 chat 2",
      userId: users[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      title: "user 1 chat 3",
      userId: users[0].id,
      createdAt: addDays(new Date(), -3),
    },
    {
      id: randomUUID(),
      title: "user 2 chat 1",
      userId: users[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      title: "user 2 chat 2",
      userId: users[1].id,
      createdAt: addDays(new Date(), -5),
    },
  ];

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
      const chatId = randomUUID();

      const exists = await chatRepository.exists({ id: chatId });

      expect(exists).toBe(false);
    });

    it("should return true when chat exists", async () => {
      const chatId = chats[0].id;

      const exists = await chatRepository.exists({ id: chatId });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all chats ordered by creation date desc", async () => {
      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        chats
          .sort(
            (chatA, chatB) =>
              (chatB.createdAt?.getTime() ?? 0) -
              (chatA.createdAt?.getTime() ?? 0)
          )
          .map((chat) => expect.objectContaining(chat))
      );
    });

    it("should return an empty array when user has no chats", async () => {
      const userId = users[2].id;

      const databaseUserChats = await chatRepository.findAll({ userId });

      expect(databaseUserChats).toEqual([]);
    });

    it("should return all user chats ordered by creation date desc", async () => {
      const userId = users[0].id;

      const databaseUserChats = await chatRepository.findAll({ userId });

      expect(databaseUserChats).toEqual(
        chats
          .filter((chat) => chat.userId === userId)
          .sort(
            (chatA, chatB) =>
              (chatB.createdAt?.getTime() ?? 0) -
              (chatA.createdAt?.getTime() ?? 0)
          )
          .map((chat) => expect.objectContaining(chat))
      );
    });
  });

  describe("findAllPaginated", () => {
    it("should return empty pagination when user has no chats", async () => {
      const userId = users[2].id;
      const page = 1;
      const pageSize = 50;

      const databasePaginatedUserChats = await chatRepository.findAllPaginated(
        page,
        pageSize,
        { userId }
      );

      expect(databasePaginatedUserChats).toEqual({
        items: [],
        totalItems: 0,
        page,
        pageSize,
        totalPages: 1,
      });
    });

    it("should return user chats ordered by creation date desc paginated", async () => {
      const userId = users[0].id;
      const page = 2;
      const pageSize = 2;

      const databasePaginatedUserChats = await chatRepository.findAllPaginated(
        page,
        pageSize,
        { userId }
      );

      const sortedUserChats = chats
        .filter((chat) => chat.userId === userId)
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        );

      expect(databasePaginatedUserChats).toEqual({
        items: sortedUserChats
          .slice((page - 1) * pageSize, page * pageSize)
          .map((chat) => expect.objectContaining(chat)),
        totalItems: sortedUserChats.length,
        page,
        pageSize,
        totalPages: Math.ceil(sortedUserChats.length / pageSize),
      });
    });
  });

  describe("findOne", () => {
    it("should return null when chat does not exist", async () => {
      const chatId = randomUUID();

      const databaseChat = await chatRepository.findOne({ id: chatId });

      expect(databaseChat).toBeNull();
    });

    it("should return chat", async () => {
      const chat = chats[0];

      const databaseChat = await chatRepository.findOne({ id: chat.id });

      expect(databaseChat).toEqual(expect.objectContaining(chat));
    });
  });

  describe("create", () => {
    it("should create a new chat", async () => {
      const chat: Chat = {
        id: randomUUID(),
        title: "title",
        userId: users[0].id,
      };

      await chatRepository.create(chat);

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          [...chats, chat].map((chat) => expect.objectContaining(chat))
        )
      );
    });
  });

  describe("update", () => {
    it("should update chat title", async () => {
      const chatId = chats[0].id;
      const updatedChatTitle = "updated title";

      await chatRepository.update(chatId, { title: updatedChatTitle });

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          chats.map((chat) =>
            chat.id === chatId
              ? expect.objectContaining({ ...chat, title: updatedChatTitle })
              : expect.objectContaining(chat)
          )
        )
      );
    });
  });

  describe("delete", () => {
    it("should not delete chat when it does not exist", async () => {
      await chatRepository.delete(randomUUID());

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          chats.map((chat) => expect.objectContaining(chat))
        )
      );
    });

    it("should delete chat", async () => {
      const chatId = chats[0].id;

      await chatRepository.delete(chatId);

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          chats
            .filter((chat) => chat.id !== chatId)
            .map((chat) => expect.objectContaining(chat))
        )
      );
    });
  });
});
