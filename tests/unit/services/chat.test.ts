import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { IFileStorage } from "../../../src/files/file-storage";
import { Chat } from "../../../src/models/entities/chat";
import {
  AssistantContentBlock,
  AssistantMessage,
  Message,
  TextContentBlock,
} from "../../../src/models/entities/message";
import { User } from "../../../src/models/entities/user";
import {
  CreateChatRequest,
  SendMessageRequest,
} from "../../../src/models/requests/chat";
import { IChatRepository } from "../../../src/repositories/chat";
import { IDocumentRepository } from "../../../src/repositories/document";
import { IMessageRepository } from "../../../src/repositories/message";
import { IProjectRepository } from "../../../src/repositories/project";
import { IUserRepository } from "../../../src/repositories/user";
import { IAssistantService } from "../../../src/services/assistant";
import { AuthContext } from "../../../src/services/auth";
import { ChatService } from "../../../src/services/chat";
import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";
import { PromiseUtils } from "../../../src/utils/promises";
import { CursorPagination } from "../../../src/utils/types";

describe("ChatService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let fileStorage: jest.Mocked<IFileStorage>;
  let userRepository: jest.Mocked<IUserRepository>;
  let projectRepository: jest.Mocked<IProjectRepository>;
  let chatRepository: jest.Mocked<IChatRepository>;
  let messageRepository: jest.Mocked<IMessageRepository>;
  let documentRepository: jest.Mocked<IDocumentRepository>;
  let assistantService: jest.Mocked<IAssistantService>;
  let chatService: ChatService;

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const authContext: AuthContext = {
    session: {
      id: randomUUID(),
      expiresAt: new Date().toISOString(),
      userId: mockUser.id,
      createdAt: new Date().toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  const mockChats = Array.from({ length: 25 }, (_, index) => ({
    id: randomUUID(),
    title: `Chat ${index + 1}`,
    projectId: null,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mockMessages: Message[] = mockChats.flatMap((chat) => {
    const userMessageId = randomUUID();

    return [
      {
        id: userMessageId,
        role: "user",
        content: [{ type: "text", id: randomUUID(), text: "User Message" }],
        feedback: null,
        finishReason: null,
        parentMessageId: null,
        chatId: chat.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        role: "assistant",
        content: [
          { type: "text", id: randomUUID(), text: "Assistant Message" },
        ],
        feedback: null,
        finishReason: "stop",
        parentMessageId: userMessageId,
        chatId: chat.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    fileStorage = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      deleteFiles: jest.fn(),
    };

    userRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    projectRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    chatRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteAll: jest.fn(),
    };

    messageRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    documentRepository = {
      count: jest.fn(),
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getChatContextDocuments: jest.fn(),
      getAllUserChatDocuments: jest.fn(),
    };

    assistantService = {
      getStatus: jest.fn(),
      isContentValid: jest.fn(),
      generateChatTitle: jest.fn(),
      sendMessage: jest.fn(),
    };

    chatService = new ChatService(
      dataContext,
      fileStorage,
      userRepository,
      projectRepository,
      chatRepository,
      messageRepository,
      documentRepository,
      assistantService
    );
  });

  describe("getChats", () => {
    it("should return chats paginated", async () => {
      const cursor = new Date();
      const limit = 10;

      const mockChatsPaginated: CursorPagination<Chat, Date> = {
        items: mockChats.slice(0, limit),
        totalItems: mockChats.length,
        nextCursor: mockChats[limit].createdAt,
      };

      chatRepository.findAllPaginated.mockResolvedValue(mockChatsPaginated);

      const response = await chatService.getChats(
        { cursor: cursor.toISOString(), limit: limit.toString() },
        authContext
      );

      expect(response).toEqual(mockChatsPaginated);
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
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should return chat", async () => {
      const mockChat = mockChats[0];

      chatRepository.findOne.mockResolvedValue(mockChat);

      const response = await chatService.getChat(
        { chatId: mockChat.id },
        {},
        authContext
      );

      expect(response).toEqual(mockChat);
    });
  });

  describe("getChatMessages", () => {
    it("should throw a not found error when chat does not exist", async () => {
      chatRepository.findOne.mockResolvedValue(null);

      try {
        await chatService.getChatMessages(
          { chatId: randomUUID() },
          authContext
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should return chat message tree", async () => {
      const mockChat = mockChats[0];
      const mockChatMessages = mockMessages.filter(
        (message) => message.chatId === mockChat.id
      );

      chatRepository.exists.mockResolvedValue(true);

      messageRepository.findAll.mockResolvedValue(mockChatMessages);

      const response = await chatService.getChatMessages(
        { chatId: mockChat.id },
        authContext
      );

      expect(response).toEqual({
        latestPath: mockChatMessages.map((message) => message.id),
        rootMessageIds: [mockChatMessages[0].id],
        messages: {
          [mockChatMessages[0].id]: mockChatMessages[0],
          [mockChatMessages[1].id]: mockChatMessages[1],
        },
      });
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

        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should create chat and stream assistant response", async () => {
      const request: CreateChatRequest = {
        id: randomUUID(),
        message: [{ type: "text", id: randomUUID(), text: "User Message" }],
      };

      const mockAssistantMessage: AssistantMessage = {
        id: randomUUID(),
        role: "assistant",
        content: [
          { type: "text", id: randomUUID(), text: "Assistant Message" },
        ],
        feedback: null,
        finishReason: "stop",
        parentMessageId: randomUUID(),
        chatId: request.id,
      };

      const textContentBlock = mockAssistantMessage
        .content[0] as TextContentBlock;

      assistantService.sendMessage.mockImplementation(async (options) => {
        options.onMessagePart({
          type: "message-start",
          messageId: mockAssistantMessage.id,
        });

        await PromiseUtils.sleep(10);

        options.onMessagePart({
          type: "text-start",
          id: textContentBlock.id,
          messageId: mockAssistantMessage.id,
        });

        await PromiseUtils.sleep(10);

        const deltas = textContentBlock.text.split(" ");

        for (let index = 0; index < deltas.length; index++) {
          const delta = deltas[index];

          options.onMessagePart({
            type: "text-delta",
            id: textContentBlock.id,
            delta: index < deltas.length - 1 ? delta + " " : delta,
            messageId: mockAssistantMessage.id,
          });

          await PromiseUtils.sleep(10);
        }

        options.onMessagePart({
          type: "text-end",
          id: textContentBlock.id,
          messageId: mockAssistantMessage.id,
        });

        await PromiseUtils.sleep(10);

        options.onMessagePart({
          type: "message-end",
          finishReason: "stop",
          messageId: mockAssistantMessage.id,
        });

        return mockAssistantMessage;
      });

      let receivedEvents: string[] = [];

      const contentBlocks: AssistantContentBlock[] = [];
      const contentBlocksMap: Map<string, AssistantContentBlock> = new Map();

      await chatService.createChat(request, authContext, (event) => {
        receivedEvents.push(event.event);

        switch (event.event) {
          case "start": {
            expect(event).toEqual({ event: "start" });

            break;
          }
          case "message-start": {
            expect(event).toEqual({
              event: "message-start",
              data: {
                type: "message-start",
                messageId: mockAssistantMessage.id,
              },
            });

            break;
          }
          case "text-start": {
            contentBlocksMap.set(event.data.id, {
              type: "text",
              id: event.data.id,
              text: "",
            });

            expect(event).toEqual({
              event: "text-start",
              data: {
                type: "text-start",
                id: textContentBlock.id,
                messageId: mockAssistantMessage.id,
              },
            });

            break;
          }
          case "text-delta": {
            const contentBlock = contentBlocksMap.get(event.data.id)!;

            (contentBlock as TextContentBlock).text += event.data.delta;

            expect(event).toEqual({
              event: "text-delta",
              data: {
                type: "text-delta",
                id: textContentBlock.id,
                delta: expect.any(String),
                messageId: mockAssistantMessage.id,
              },
            });

            break;
          }
          case "text-end": {
            const contentBlock = contentBlocksMap.get(event.data.id)!;

            contentBlocks.push(contentBlock);

            expect(event).toEqual({
              event: "text-end",
              data: {
                type: "text-end",
                id: textContentBlock.id,
                messageId: mockAssistantMessage.id,
              },
            });

            break;
          }
          case "message-end": {
            expect(event).toEqual({
              event: "message-end",
              data: {
                type: "message-end",
                finishReason: mockAssistantMessage.finishReason,
                messageId: mockAssistantMessage.id,
              },
            });

            break;
          }
          case "end": {
            expect(event).toEqual({ event: "end" });

            break;
          }
        }
      });

      expect(contentBlocks).toEqual(mockAssistantMessage.content);
      expect(receivedEvents).toContain("start");
      expect(receivedEvents).toContain("message-start");
      expect(receivedEvents).toContain("text-start");
      expect(receivedEvents).toContain("text-delta");
      expect(receivedEvents).toContain("text-end");
      expect(receivedEvents).toContain("message-end");
      expect(receivedEvents).toContain("end");
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
          {
            id: randomUUID(),
            content: [
              { type: "text", id: randomUUID(), text: "New User Message" },
            ],
          },
          authContext,
          () => {}
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should create message and stream assistant response", async () => {
      const mockChat = mockChats[0];
      const mockChatMessages = mockMessages.filter(
        (message) => message.chatId === mockChat.id
      );

      const request: SendMessageRequest = {
        id: randomUUID(),
        content: [{ type: "text", id: randomUUID(), text: "New User Message" }],
        parentMessageId: mockChatMessages[mockChatMessages.length - 1].id,
      };

      const mockAssistantMessage: AssistantMessage = {
        id: randomUUID(),
        role: "assistant",
        content: [
          { type: "text", id: randomUUID(), text: "New Assistant Message" },
        ],
        feedback: null,
        finishReason: "stop",
        parentMessageId: request.id,
        chatId: mockChat.id,
      };

      const textContentBlock = mockAssistantMessage
        .content[0] as TextContentBlock;

      chatRepository.findOne.mockResolvedValue(mockChat);

      assistantService.sendMessage.mockImplementation(async (options) => {
        options.onMessagePart({
          type: "message-start",
          messageId: mockAssistantMessage.id,
        });

        await PromiseUtils.sleep(10);

        options.onMessagePart({
          type: "text-start",
          id: textContentBlock.id,
          messageId: mockAssistantMessage.id,
        });

        await PromiseUtils.sleep(10);

        const deltas = textContentBlock.text.split(" ");

        for (let index = 0; index < deltas.length; index++) {
          const delta = deltas[index];

          options.onMessagePart({
            type: "text-delta",
            id: textContentBlock.id,
            delta: index < deltas.length - 1 ? delta + " " : delta,
            messageId: mockAssistantMessage.id,
          });

          await PromiseUtils.sleep(10);
        }

        options.onMessagePart({
          type: "text-end",
          id: textContentBlock.id,
          messageId: mockAssistantMessage.id,
        });

        await PromiseUtils.sleep(10);

        options.onMessagePart({
          type: "message-end",
          finishReason: "stop",
          messageId: mockAssistantMessage.id,
        });

        return mockAssistantMessage;
      });

      let receivedEvents: string[] = [];

      const contentBlocks: AssistantContentBlock[] = [];
      const contentBlocksMap: Map<string, AssistantContentBlock> = new Map();

      await chatService.sendMessage(
        { chatId: mockChat.id },
        request,
        authContext,
        (event) => {
          receivedEvents.push(event.event);

          switch (event.event) {
            case "start": {
              expect(event).toEqual({ event: "start" });

              break;
            }
            case "message-start": {
              expect(event).toEqual({
                event: "message-start",
                data: {
                  type: "message-start",
                  messageId: mockAssistantMessage.id,
                },
              });

              break;
            }
            case "text-start": {
              contentBlocksMap.set(event.data.id, {
                type: "text",
                id: event.data.id,
                text: "",
              });

              expect(event).toEqual({
                event: "text-start",
                data: {
                  type: "text-start",
                  id: textContentBlock.id,
                  messageId: mockAssistantMessage.id,
                },
              });

              break;
            }
            case "text-delta": {
              const contentBlock = contentBlocksMap.get(event.data.id)!;

              (contentBlock as TextContentBlock).text += event.data.delta;

              expect(event).toEqual({
                event: "text-delta",
                data: {
                  type: "text-delta",
                  id: textContentBlock.id,
                  delta: expect.any(String),
                  messageId: mockAssistantMessage.id,
                },
              });

              break;
            }
            case "text-end": {
              const contentBlock = contentBlocksMap.get(event.data.id)!;

              contentBlocks.push(contentBlock);

              expect(event).toEqual({
                event: "text-end",
                data: {
                  type: "text-end",
                  id: textContentBlock.id,
                  messageId: mockAssistantMessage.id,
                },
              });

              break;
            }
            case "message-end": {
              expect(event).toEqual({
                event: "message-end",
                data: {
                  type: "message-end",
                  finishReason: mockAssistantMessage.finishReason,
                  messageId: mockAssistantMessage.id,
                },
              });

              break;
            }
            case "end": {
              expect(event).toEqual({ event: "end" });

              break;
            }
          }
        }
      );

      expect(contentBlocks).toEqual(mockAssistantMessage.content);
      expect(receivedEvents).toContain("start");
      expect(receivedEvents).toContain("message-start");
      expect(receivedEvents).toContain("text-start");
      expect(receivedEvents).toContain("text-delta");
      expect(receivedEvents).toContain("text-end");
      expect(receivedEvents).toContain("message-end");
      expect(receivedEvents).toContain("end");
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
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should update chat title and return its id", async () => {
      const mockChat = mockChats[0];

      chatRepository.exists.mockResolvedValue(true);

      const response = await chatService.updateChat(
        { chatId: mockChat.id },
        { title: "Updated Chat Title" },
        authContext
      );

      expect(response).toEqual(mockChat.id);
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
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should delete chat and return its id", async () => {
      const mockChat = mockChats[0];

      chatRepository.exists.mockResolvedValue(true);

      documentRepository.findAll.mockResolvedValue([]);

      const response = await chatService.deleteChat(
        { chatId: mockChat.id },
        authContext
      );

      expect(response).toEqual(mockChat.id);
    });
  });

  describe("deleteAllChats", () => {
    it("should delete all user chats and return true", async () => {
      documentRepository.getAllUserChatDocuments.mockResolvedValue([]);

      const response = await chatService.deleteAllChats(authContext);

      expect(response).toBe(true);
    });
  });
});
