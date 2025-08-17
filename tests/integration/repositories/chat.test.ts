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
    {
      id: randomUUID(),
      name: "User 3",
      email: "user3@example.com",
      password: "password",
      createdAt: addDays(new Date(), -13),
    },
  ];
  const chats: Chat[] = [
    {
      id: randomUUID(),
      title: "User 1 Chat 1",
      userId: users[0].id,
      createdAt: addDays(new Date(), -1),
    },
    {
      id: randomUUID(),
      title: "User 1 Chat 2",
      userId: users[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      title: "User 1 Chat 3",
      userId: users[0].id,
      createdAt: addDays(new Date(), -3),
    },
    {
      id: randomUUID(),
      title: "User 2 Chat 1",
      userId: users[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      title: "User 2 Chat 2",
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

      const expectedChats = chats
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        )
        .map((chat) => expect.objectContaining(chat));

      expect(databaseChats).toEqual(expectedChats);
    });

    it("should return an empty array when user has no chats", async () => {
      const userId = users[2].id;

      const databaseUserChats = await chatRepository.findAll({ userId });

      expect(databaseUserChats).toEqual([]);
    });

    it("should return all user chats ordered by creation date desc", async () => {
      const userId = users[0].id;

      const databaseUserChats = await chatRepository.findAll({ userId });

      const expectedUserChats = chats
        .filter((chat) => chat.userId === userId)
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        )
        .map((chat) => expect.objectContaining(chat));

      expect(databaseUserChats).toEqual(expectedUserChats);
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

      const expectedPaginatedUserChats = {
        items: [],
        totalItems: 0,
        page,
        pageSize,
        totalPages: 0,
      };

      expect(databasePaginatedUserChats).toEqual(expectedPaginatedUserChats);
    });

    it("should return all user chats ordered by creation date desc paginated", async () => {
      const userId = users[0].id;
      const page = 2;
      const pageSize = 2;

      const databasePaginatedUserChats = await chatRepository.findAllPaginated(
        page,
        pageSize,
        { userId }
      );

      const userChats = chats.filter((chat) => chat.userId === userId);

      const expectedPaginatedUserChats = {
        items: userChats
          .slice((page - 1) * pageSize, page * pageSize)
          .map((chat) => expect.objectContaining(chat)),
        totalItems: userChats.length,
        page,
        pageSize,
        totalPages: Math.ceil(userChats.length / pageSize),
      };

      expect(databasePaginatedUserChats).toEqual(expectedPaginatedUserChats);
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

      const expectedChat = expect.objectContaining(chat);

      expect(databaseChat).toEqual(expectedChat);
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

      const expectedChats = expect.arrayContaining(
        [...chats, chat].map((chat) => expect.objectContaining(chat))
      );

      expect(databaseChats).toEqual(expectedChats);
    });
  });

  describe("update", () => {
    it("should update chat", async () => {
      const chatId = chats[0].id;
      const updatedChatTitle = "Updated Chat Title";

      await chatRepository.update(chatId, { title: updatedChatTitle });

      const databaseChats = await chatRepository.findAll();

      const expectedChats = expect.arrayContaining(
        chats.map((chat) =>
          chat.id === chatId
            ? expect.objectContaining({ ...chat, title: updatedChatTitle })
            : expect.objectContaining(chat)
        )
      );

      expect(databaseChats).toEqual(expectedChats);
    });
  });

  describe("delete", () => {
    it("should not delete chat when it does not exist", async () => {
      await chatRepository.delete(randomUUID());

      const databaseChats = await chatRepository.findAll();

      const expectedChats = expect.arrayContaining(
        chats.map((chat) => expect.objectContaining(chat))
      );

      expect(databaseChats).toEqual(expectedChats);
    });

    it("should delete chat", async () => {
      const chatId = chats[0].id;

      await chatRepository.delete(chatId);

      const databaseChats = await chatRepository.findAll();

      const expectedChats = expect.arrayContaining(
        chats
          .filter((chat) => chat.id !== chatId)
          .map((chat) => expect.objectContaining(chat))
      );

      expect(databaseChats).toEqual(expectedChats);
    });
  });
});
