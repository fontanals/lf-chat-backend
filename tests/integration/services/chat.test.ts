import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
import { Session } from "../../../src/models/entities/session";
import { mapUserToDto, User } from "../../../src/models/entities/user";
import {
  CreateChatRequest,
  DeleteChatParams,
  GetChatMessagesParams,
  GetChatsQuery,
  SendMessageParams,
  SendMessageRequest,
  UpdateChatParams,
  UpdateChatRequest,
} from "../../../src/models/requests/chat";
import { ChatRepository } from "../../../src/repositories/chat";
import { MessageRepository } from "../../../src/repositories/message";
import { AssistantService } from "../../../src/services/assistant";
import { AuthContext } from "../../../src/services/auth";
import { ChatService } from "../../../src/services/chat";
import {
  createTestPool,
  insertChats,
  insertMessages,
  insertSessions,
  insertUsers,
  truncateChats,
  truncateUsers,
} from "../../utils";

describe("ChatService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const chatRepository = new ChatRepository(dataContext);
  const messageRepository = new MessageRepository(dataContext);
  const chatService = new ChatService(
    dataContext,
    chatRepository,
    messageRepository,
    new AssistantService()
  );

  const users: User[] = [
    {
      id: randomUUID(),
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -15),
    },
    {
      id: randomUUID(),
      name: "user 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -19),
    },
  ];
  const sessions: Session[] = [
    {
      id: randomUUID(),
      userId: users[0].id,
      createdAt: addDays(new Date(), -12),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      createdAt: addDays(new Date(), -9),
    },
  ];
  const chats: Chat[] = [
    {
      id: randomUUID(),
      title: "user 1 chat 1",
      userId: users[0].id,
      createdAt: addDays(new Date(), -12),
    },
    {
      id: randomUUID(),
      title: "user 1 chat 2",
      userId: users[0].id,
      createdAt: addDays(new Date(), -10),
    },
    {
      id: randomUUID(),
      title: "uset 2 chat 1",
      userId: users[1].id,
      createdAt: addDays(new Date(), -15),
    },
    {
      id: randomUUID(),
      title: "user 2 chat 2",
      userId: users[1].id,
      createdAt: addDays(new Date(), -9),
    },
  ];
  const messages: Message[] = [
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -12),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -12),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -10),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -10),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -15),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -15),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[3].id,
      createdAt: addDays(new Date(), -9),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[3].id,
      createdAt: addDays(new Date(), -9),
    },
  ];

  beforeAll(async () => {
    await insertUsers(users, pool);
    await insertSessions(sessions, pool);
  });

  beforeEach(async () => {
    await insertChats(chats, pool);
    await insertMessages(messages, pool);
  });

  afterEach(async () => {
    await truncateChats(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("getChats", () => {
    it("should return user chats ordered by creation date desc paginated", async () => {
      const user = users[0];
      const authContext: AuthContext = {
        session: sessions[0],
        user: mapUserToDto(user),
      };

      const page = 1;
      const pageSize = 10;
      const query: GetChatsQuery = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };

      const response = await chatService.getChats(query, authContext);

      const sortedChats = chats
        .filter((chat) => chat.userId === user.id)
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        );

      expect(response).toEqual({
        chats: {
          items: sortedChats
            .slice((page - 1) * pageSize, page * pageSize)
            .map((chat) => expect.objectContaining(chat)),
          totalItems: sortedChats.length,
          page,
          pageSize,
          totalPages: Math.ceil(sortedChats.length / pageSize),
        },
      });
    });
  });

  describe("getChatMessages", () => {
    it("should return chat messages ordered by creation date asc", async () => {
      const user = users[0];
      const authContext: AuthContext = {
        session: sessions[0],
        user: mapUserToDto(user),
      };

      const chat = chats[0];
      const params: GetChatMessagesParams = { chatId: chat.id };

      const response = await chatService.getChatMessages(params, authContext);

      expect(response).toEqual({
        messages: messages
          .filter((message) => message.chatId === chat.id)
          .sort(
            (messageA, messageB) =>
              (messageA.createdAt?.getTime() ?? 0) -
              (messageB.createdAt?.getTime() ?? 0)
          )
          .map((message) => expect.objectContaining(message)),
      });
    });
  });

  describe("createChat", () => {
    it("should create a new chat with user and assistant messages", async () => {
      const user = users[1];
      const authContext: AuthContext = {
        session: sessions[1],
        user: mapUserToDto(user),
      };

      const request: CreateChatRequest = {
        id: randomUUID(),
        message: "message",
      };

      let assistantMessageId = "";
      let assistantMessageContent = "";

      await chatService.createChat(request, authContext, (event) => {
        if (event.event === "start") {
          assistantMessageId = event.data.messageId;
        } else if (event.event === "delta") {
          assistantMessageContent += event.data.delta;
        }
      });

      const databaseChat = await chatRepository.findOne({ id: request.id });

      if (databaseChat == null) {
        fail("Expected chat to be created");
      }

      const databaseMessages = await messageRepository.findAll({
        chatId: request.id,
      });

      expect(databaseChat).toEqual(
        expect.objectContaining({ id: request.id, userId: user.id })
      );
      expect(databaseMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: request.message,
            chatId: request.id,
          }),
          expect.objectContaining({
            id: assistantMessageId,
            role: "assistant",
            content: assistantMessageContent,
            chatId: request.id,
          }),
        ])
      );
    });
  });

  describe("sendMessage", () => {
    it("should add a new user message and assistant response to chat", async () => {
      const user = users[0];
      const authContext: AuthContext = {
        session: sessions[0],
        user: mapUserToDto(user),
      };

      const params: SendMessageParams = { chatId: chats[0].id };
      const request: SendMessageRequest = {
        id: randomUUID(),
        content: "message",
      };

      let assistantMessageId = "";
      let assistantMessageContent = "";

      await chatService.sendMessage(params, request, authContext, (event) => {
        if (event.event === "start") {
          assistantMessageId = event.data.messageId;
        } else if (event.event === "delta") {
          assistantMessageContent += event.data.delta;
        }
      });

      const databaseChat = await chatRepository.findOne({ id: params.chatId });

      if (databaseChat == null) {
        fail("Expected chat to be found");
      }

      const databaseMessages = await messageRepository.findAll({
        chatId: params.chatId,
      });

      expect(databaseChat).toEqual(
        expect.objectContaining({ id: params.chatId, userId: user.id })
      );
      expect(databaseMessages).toEqual(
        expect.arrayContaining([
          ...messages
            .filter((message) => message.chatId === params.chatId)
            .map((message) => expect.objectContaining(message)),
          expect.objectContaining({
            id: request.id,
            role: "user",
            content: request.content,
            chatId: params.chatId,
          }),
          expect.objectContaining({
            id: assistantMessageId,
            role: "assistant",
            content: assistantMessageContent,
            chatId: params.chatId,
          }),
        ])
      );
    });
  });

  describe("updateChat", () => {
    it("should update chat title", async () => {
      const user = users[0];
      const chat = chats[1];
      const authContext: AuthContext = {
        session: sessions[0],
        user: mapUserToDto(user),
      };

      const params: UpdateChatParams = { chatId: chat.id };
      const request: UpdateChatRequest = { title: "Updated Chat Title" };

      const response = await chatService.updateChat(
        params,
        request,
        authContext
      );

      const databaseChat = await chatRepository.findOne({ id: params.chatId });

      expect(databaseChat).toEqual(
        expect.objectContaining({ ...chat, title: request.title })
      );
      expect(response).toEqual({ chatId: params.chatId });
    });
  });

  describe("deleteChat", () => {
    it("should delete chat", async () => {
      const user = users[0];
      const authContext: AuthContext = {
        session: sessions[0],
        user: mapUserToDto(user),
      };

      const params: DeleteChatParams = { chatId: chats[1].id };

      const response = await chatService.deleteChat(params, authContext);

      const databaseChat = await chatRepository.findOne({ id: params.chatId });

      expect(databaseChat).toBeNull();
      expect(response).toEqual({ chatId: params.chatId });
    });
  });
});
