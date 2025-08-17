import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { Pool } from "pg";
import { DataContext } from "../../../src/data/context";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
import {
  CreateChatRequest,
  DeleteChatParams,
  GetChatMessagesParams,
  RenameChatParams,
  RenameChatRequest,
  SendMessageParams,
  SendMessageRequest,
} from "../../../src/models/requests/chat";
import { ChatRepository } from "../../../src/repositories/chat";
import { MessageRepository } from "../../../src/repositories/message";
import { AssistantService } from "../../../src/services/assistant";
import { AuthContext } from "../../../src/services/auth";
import { ChatService } from "../../../src/services/chat";
import { NumberUtils } from "../../../src/utils/numbers";
import { SqlUtils } from "../../../src/utils/sql";
import { testConfig } from "../../config";

describe("ChatService", () => {
  const pool = new Pool({
    host: testConfig.TEST_POSTGRES_HOST,
    port: NumberUtils.safeParseInt(testConfig.TEST_POSTGRES_PORT, 5432),
    user: testConfig.TEST_POSTGRES_USER,
    password: testConfig.TEST_POSTGRES_PASSWORD,
    database: testConfig.TEST_POSTGRES_DB,
  });
  const dataContext = new DataContext(pool);
  const chatRepository = new ChatRepository(dataContext);
  const messageRepository = new MessageRepository(dataContext);
  const chatService = new ChatService(
    dataContext,
    chatRepository,
    messageRepository,
    new AssistantService()
  );

  const user1Id = randomUUID();
  const user2Id = randomUUID();
  const chats: Chat[] = [
    {
      id: randomUUID(),
      userId: user1Id,
      title: "New Chat",
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      userId: user1Id,
      title: "Space Joke",
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      userId: user2Id,
      title: "New Chat",
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      userId: user2Id,
      title: "Weather Joke",
      createdAt: addDays(new Date(), -10),
    },
  ];
  const messages: Message[] = [
    {
      id: randomUUID(),
      role: "user",
      content: "Hi",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "Hello! How can i help you today?",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "Can you tell me a joke about space?",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content:
        "Why don’t astronauts get hungry after being blasted into space? Because they’ve just had a big launch.",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "Hello!",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "Hello there! How can i help you today?",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "Can you tell me a joke about the weather?",
      chatId: chats[3].id,
      createdAt: addDays(new Date(), -10),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content:
        "Why did the tornado break up with the hurricane? Because it needed some space… and a little less drama.",
      chatId: chats[3].id,
      createdAt: addDays(new Date(), -10),
    },
  ];

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO "user"
      (id, name, email, password)
      VALUES
      ($1, 'John Doe', 'john_doe@example.com', 'password'),
      ($2, 'Jane Doe', 'jane_doe@example.com', 'password');`,
      [user1Id, user2Id]
    );
  });

  beforeEach(async () => {
    await pool.query(
      `INSERT INTO "chat"
      (id, title, user_id, created_at)
      VALUES
      ${SqlUtils.values(chats.length, 4)};`,
      chats.flatMap((chat) => [
        chat.id,
        chat.title,
        chat.userId,
        chat.createdAt,
      ])
    );

    await pool.query(
      `INSERT INTO "message"
      (id, role, content, chat_id, created_at)
      VALUES
      ${SqlUtils.values(messages.length, 5)};`,
      messages.flatMap((message) => [
        message.id,
        message.role,
        message.content,
        message.chatId,
        message.createdAt,
      ])
    );
  });

  afterEach(async () => {
    await pool.query(`TRUNCATE "chat" CASCADE;`);
  });

  afterAll(async () => {
    await pool.query(`TRUNCATE "user" CASCADE;`);
    await pool.end();
  });

  describe("getChats", () => {
    it("should return all user chats ordered by creation date desc", async () => {
      const authContext: AuthContext = {
        session: { id: randomUUID(), userId: user1Id },
        user: { id: user1Id, name: "John Doe", email: "john_doe@example.com" },
      };

      const result = await chatService.getChats(authContext);

      const expectedChats = chats
        .filter((chat) => chat.userId === user1Id)
        .map((chat) => expect.objectContaining(chat));

      expect(result.chats).toEqual(expectedChats);
    });
  });

  describe("getChatMessages", () => {
    it("should return all chat messages ordered by creation date asc", async () => {
      const authContext: AuthContext = {
        session: { id: randomUUID(), userId: user1Id },
        user: { id: user2Id, name: "Jane Doe", email: "jane_doe@example.com" },
      };

      const params: GetChatMessagesParams = { chatId: chats[3].id };

      const result = await chatService.getChatMessages(params, authContext);

      const expectedMessages = messages
        .filter((message) => message.chatId === chats[3].id)
        .map((message) => expect.objectContaining(message));

      expect(result.messages).toEqual(expectedMessages);
    });
  });

  describe("createChat", () => {
    it("should create a new chat with user and assistant messages", async () => {
      const authContext: AuthContext = {
        session: { id: randomUUID(), userId: user1Id },
        user: { id: user1Id, name: "John Doe", email: "john_doe@example.com" },
      };

      const request: CreateChatRequest = {
        id: randomUUID(),
        message: "Can you tell me a joke about space?",
      };

      await chatService.createChat(request, authContext, () => {});

      const databaseChat = await chatRepository.findOne({ id: request.id });
      const databaseMessages = await messageRepository.findAll({
        chatId: request.id,
      });

      if (databaseChat == null) {
        fail("Expected chat to be created");
      }

      const expectedDatabaseMessages = expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: request.message,
          chatId: request.id,
        }),
        expect.objectContaining({
          role: "assistant",
          content: expect.any(String),
          chatId: request.id,
        }),
      ]);

      expect(databaseChat).toEqual(
        expect.objectContaining({ id: request.id, userId: authContext.user.id })
      );
      expect(databaseMessages).toEqual(expectedDatabaseMessages);
    });
  });

  describe("sendMessage", () => {
    it("should add a new user message and assistant response to chat", async () => {
      const authContext: AuthContext = {
        session: { id: randomUUID(), userId: user1Id },
        user: { id: user1Id, name: "John Doe", email: "john_doe@example.com" },
      };

      const params: SendMessageParams = { chatId: chats[0].id };

      const request: SendMessageRequest = {
        id: randomUUID(),
        content: "Can you tell me a joke about space?",
      };

      await chatService.sendMessage(params, request, authContext, () => {});

      const databaseChat = await chatRepository.findOne({ id: params.chatId });
      const databaseMessages = await messageRepository.findAll({
        chatId: params.chatId,
      });

      if (databaseChat == null) {
        fail("Expected chat to be found");
      }

      const expectedMessages = expect.arrayContaining([
        ...messages
          .filter((message) => message.chatId === params.chatId)
          .map((message) => expect.objectContaining(message)),
        expect.objectContaining({
          role: "user",
          content: request.content,
          chatId: params.chatId,
        }),
        expect.objectContaining({
          role: "assistant",
          content: expect.any(String),
          chatId: params.chatId,
        }),
      ]);

      expect(databaseChat).toEqual(
        expect.objectContaining({
          id: params.chatId,
          userId: authContext.user.id,
        })
      );
      expect(databaseMessages).toEqual(expectedMessages);
    });
  });

  describe("renameChat", () => {
    it("should rename chat", async () => {
      const authContext: AuthContext = {
        session: { id: randomUUID(), userId: user1Id },
        user: { id: user1Id, name: "John Doe", email: "john_doe@example.com" },
      };

      const params: RenameChatParams = { chatId: chats[0].id };
      const request: RenameChatRequest = { title: "Updated Chat Title" };

      const result = await chatService.renameChat(params, request, authContext);

      const databaseChats = await chatRepository.findAll();

      const expectedChats = expect.arrayContaining(
        chats.map((chat) =>
          chat.id === params.chatId
            ? expect.objectContaining({ ...chat, title: request.title })
            : expect.objectContaining(chat)
        )
      );

      expect(result.chatId).toBe(params.chatId);
      expect(databaseChats).toEqual(expectedChats);
    });
  });

  describe("deleteChat", () => {
    it("should delete chat", async () => {
      const authContext: AuthContext = {
        session: { id: randomUUID(), userId: user1Id },
        user: { id: user1Id, name: "John Doe", email: "john_doe@example.com" },
      };

      const params: DeleteChatParams = { chatId: chats[0].id };

      const result = await chatService.deleteChat(params, authContext);

      const databaseChats = await chatRepository.findAll();

      const expectedChats = expect.arrayContaining(
        chats
          .filter((chat) => chat.id !== params.chatId)
          .map((chat) => expect.objectContaining(chat))
      );

      expect(result.chatId).toBe(params.chatId);
      expect(databaseChats).toEqual(expectedChats);
    });
  });
});
