import { IDataContext } from "../../../src/data/context";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
import { IChatRepository } from "../../../src/repositories/chat";
import { IMessageRepository } from "../../../src/repositories/message";
import { IAssistantService } from "../../../src/services/assistant";
import { AuthContext } from "../../../src/services/auth";
import { ChatService, IChatService } from "../../../src/services/chat";
import {
  ApplicationError,
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";

describe("ChatService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let chatRepository: jest.Mocked<IChatRepository>;
  let messageRepository: jest.Mocked<IMessageRepository>;
  let assistantService: jest.Mocked<IAssistantService>;
  let chatService: IChatService;

  const authContext: AuthContext = {
    user: { id: "user-id", name: "John Doe", email: "john.doe@example.com" },
    session: { id: "session-id", userId: "user-id" },
  };

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    chatRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    messageRepository = { findAll: jest.fn(), create: jest.fn() };

    assistantService = { sendMessage: jest.fn() };

    chatService = new ChatService(
      dataContext,
      chatRepository,
      messageRepository,
      assistantService
    );
  });

  describe("getChats", () => {
    it("should return all chats", async () => {
      const chats: Chat[] = [
        { id: "chat-1", title: "Chat 1", userId: "user-id" },
        { id: "chat-2", title: "Chat 2", userId: "user-id" },
        { id: "chat-3", title: "Chat 3", userId: "user-id" },
        { id: "chat-4", title: "Chat 4", userId: "user-id" },
        { id: "chat-5", title: "Chat 5", userId: "user-id" },
      ];

      chatRepository.findAll.mockResolvedValue(chats);

      const result = await chatService.getChats(authContext);

      expect(result.chats).toEqual(chats);
    });
  });

  describe("getChatMessages", () => {
    it("should throw a not found error when chat does not exist", async () => {
      chatRepository.exists.mockResolvedValue(false);

      try {
        await chatService.getChatMessages({ chatId: "chat-id" }, authContext);

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.NotFound
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should return chat messages when chat exists", async () => {
      const messages: Message[] = [
        {
          id: "message-1",
          role: "user",
          content: "Hello!",
          chatId: "chat-1",
        },
        {
          id: "message-2",
          role: "assistant",
          content: "Hi there! How can I help you today?",
          chatId: "chat-1",
        },
      ];

      chatRepository.exists.mockResolvedValue(true);
      messageRepository.findAll.mockResolvedValue(messages);

      const result = await chatService.getChatMessages(
        { chatId: "chat-id" },
        authContext
      );

      expect(result.messages).toEqual(messages);
    });
  });

  describe("createChat", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await chatService.createChat(
          { id: "chat-id" } as any,
          authContext,
          () => {}
        );

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should create a new chat and send start, delta, and end events with correct data", async () => {
      let expectedDeltaEventCount = 0;

      assistantService.sendMessage.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          const message = "Hi there! How can I help you today?";
          const chunks = message.split(" ");
          expectedDeltaEventCount = chunks.length;

          for (const chunk of chunks) {
            yield chunk + " ";
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        },
      });

      let sentStartEvent = false;
      let sentDeltaEvent = false;
      let deltaEventCount = 0;
      let sentEndEvent = false;

      await chatService.createChat(
        { id: "chat-id", message: "Hello!" },
        authContext,
        (event) => {
          if (event.event === "start") {
            sentStartEvent = true;
          } else if (event.event === "delta") {
            sentDeltaEvent = true;
            deltaEventCount++;
            expect(event.data.delta).toEqual(expect.any(String));
          } else if (event.event === "end") {
            sentEndEvent = true;
          }

          expect(event.data.messageId).toEqual(expect.any(String));
        }
      );

      expect(sentStartEvent).toBe(true);
      expect(sentDeltaEvent).toBe(true);
      expect(deltaEventCount).toBe(expectedDeltaEventCount);
      expect(sentEndEvent).toBe(true);
    });
  });

  describe("sendMessage", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await chatService.sendMessage(
          { chatId: "chat-id" },
          { id: "message-id" } as any,
          authContext,
          () => {}
        );

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should throw a not found error when chat does not exist", async () => {
      chatRepository.exists.mockResolvedValue(false);

      try {
        await chatService.sendMessage(
          { chatId: "chat-id" },
          { id: "message-id", content: "Hello!" },
          authContext,
          () => {}
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.NotFound
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should create a new message and send start, delta, and end events with correct data", async () => {
      chatRepository.exists.mockResolvedValue(true);
      messageRepository.findAll.mockResolvedValue([]);

      let expectedDeltaEventCount = 0;

      assistantService.sendMessage.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          const message = "Hi there! How can I help you today?";
          const chunks = message.split(" ");
          expectedDeltaEventCount = chunks.length;

          for (const chunk of chunks) {
            yield chunk + " ";
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        },
      });

      let sentStartEvent = false;
      let sentDeltaEvent = false;
      let deltaEventCount = 0;
      let sentEndEvent = false;

      await chatService.sendMessage(
        { chatId: "chat-id" },
        { id: "message-id", content: "Hello!" },
        authContext,
        (event) => {
          if (event.event === "start") {
            sentStartEvent = true;
          } else if (event.event === "delta") {
            sentDeltaEvent = true;
            deltaEventCount++;
            expect(event.data.delta).toEqual(expect.any(String));
          } else if (event.event === "end") {
            sentEndEvent = true;
          }

          expect(event.data.messageId).toEqual(expect.any(String));
        }
      );

      expect(sentStartEvent).toBe(true);
      expect(sentDeltaEvent).toBe(true);
      expect(deltaEventCount).toBe(expectedDeltaEventCount);
      expect(sentEndEvent).toBe(true);
    });
  });

  describe("renameChat", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await chatService.renameChat(
          { chatId: "chat-id" },
          { title: "Name" } as any,
          authContext
        );

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.BadRequest
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should throw a not found error when chat does not exist", async () => {
      chatRepository.exists.mockResolvedValue(false);

      try {
        await chatService.renameChat(
          { chatId: "chat-id" },
          { name: "New Chat Name" },
          authContext
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.NotFound
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should rename chat and return its id when chat exists", async () => {
      chatRepository.exists.mockResolvedValue(true);

      const chatId = "chat-id";

      const result = await chatService.renameChat(
        { chatId },
        { name: "Name" },
        authContext
      );

      expect(result.chatId).toEqual(chatId);
    });
  });

  describe("deleteChat", () => {
    it("should throw a not found error when chat does not exist", async () => {
      chatRepository.exists.mockResolvedValue(false);

      try {
        await chatService.deleteChat({ chatId: "chat-id" }, authContext);

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).statusCode).toBe(
          HttpStatusCode.NotFound
        );
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should delete chat and return its id when chat exists", async () => {
      chatRepository.exists.mockResolvedValue(true);

      const chatId = "chat-id";

      const result = await chatService.deleteChat({ chatId }, authContext);

      expect(result.chatId).toEqual(chatId);
    });
  });
});
