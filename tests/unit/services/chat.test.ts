import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Chat } from "../../../src/models/entities/chat";
import { Session } from "../../../src/models/entities/session";
import { mapUserToDto, User } from "../../../src/models/entities/user";
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

  const user: User = {
    id: randomUUID(),
    name: "user 1",
    email: "user1@example.com",
    password: "password",
    displayName: "user",
    customPreferences: null,
  };
  const chats: Chat[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    title: `chat ${index + 1}`,
    userId: user.id,
  }));
  const userDto = mapUserToDto(user);
  const session: Session = { id: randomUUID(), userId: userDto.id };
  const authContext: AuthContext = { session, user: userDto };

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
      findAllPaginated: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    messageRepository = { findAll: jest.fn(), create: jest.fn() };

    assistantService = { validateMessage: jest.fn(), sendMessage: jest.fn() };

    chatService = new ChatService(
      dataContext,
      chatRepository,
      messageRepository,
      assistantService
    );
  });

  describe("getChats", () => {
    it("should return all chats", async () => {
      chatRepository.findAllPaginated.mockResolvedValue({
        items: chats,
        totalItems: chats.length,
      });

      const response = await chatService.getChats({}, authContext);

      expect(response).toEqual({
        chats: chats,
        totalChats: chats.length,
      });
    });
  });

  describe("getChat", () => {
    it("should throw a not found error when chat does not exist", async () => {
      chatRepository.findOne.mockResolvedValue(null);

      try {
        await chatService.getChat({ chatId: randomUUID() }, {}, authContext);

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

    it("should return chat", async () => {
      const chat = chats[0];

      chatRepository.findOne.mockResolvedValue(chat);

      const response = await chatService.getChat(
        { chatId: chat.id },
        {},
        authContext
      );

      expect(response).toEqual({ chat });
    });
  });

  describe("createChat", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await chatService.createChat(
          { id: randomUUID() } as any,
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
      assistantService.validateMessage.mockResolvedValue(true);

      const answer = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      const answerChunks = answer.split(" ");
      const expectedDeltaEventCount = answerChunks.length;

      assistantService.sendMessage.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of answerChunks) {
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
        { id: randomUUID(), message: "message" },
        authContext,
        (event) => {
          if (event.event === "start") {
            sentStartEvent = true;
          } else if (event.event === "delta") {
            sentDeltaEvent = true;
            expect(event.data.delta).toEqual(
              answerChunks[deltaEventCount] + " "
            );
            deltaEventCount++;
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
          { chatId: randomUUID() },
          { id: randomUUID() } as any,
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
          { chatId: randomUUID() },
          { id: randomUUID(), content: "message" },
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
      assistantService.validateMessage.mockResolvedValue(true);
      messageRepository.findAll.mockResolvedValue([]);

      const answer = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      const answerChunks = answer.split(" ");
      const expectedDeltaEventCount = answerChunks.length;

      assistantService.sendMessage.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of answerChunks) {
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
        { chatId: randomUUID() },
        { id: randomUUID(), content: "message" },
        authContext,
        (event) => {
          if (event.event === "start") {
            sentStartEvent = true;
          } else if (event.event === "delta") {
            sentDeltaEvent = true;
            expect(event.data.delta).toEqual(
              answerChunks[deltaEventCount] + " "
            );
            deltaEventCount++;
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

  describe("updateChat", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await chatService.updateChat(
          { chatId: randomUUID() },
          {} as any,
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
        await chatService.updateChat(
          { chatId: randomUUID() },
          { title: "title" },
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

    it("should update chat title and return its id when chat exists", async () => {
      const chat = chats[0];

      chatRepository.exists.mockResolvedValue(true);

      const response = await chatService.updateChat(
        { chatId: chat.id },
        { title: "chat 1 updated" },
        authContext
      );

      expect(response).toEqual({ chatId: chat.id });
    });
  });

  describe("deleteChat", () => {
    it("should throw a not found error when chat does not exist", async () => {
      chatRepository.exists.mockResolvedValue(false);

      try {
        await chatService.deleteChat({ chatId: randomUUID() }, authContext);

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
      const chat = chats[0];

      chatRepository.exists.mockResolvedValue(true);

      const response = await chatService.deleteChat(
        { chatId: chat.id },
        authContext
      );

      expect(response).toEqual({ chatId: chat.id });
    });
  });
});
