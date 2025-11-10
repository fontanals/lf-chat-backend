import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { FileStorage } from "../../../src/files/file-storage";
import { Chat } from "../../../src/models/entities/chat";
import { Document } from "../../../src/models/entities/document";
import {
  AssistantContentBlock,
  Message,
  MessageFinishReason,
  ToolCallContentBlock,
} from "../../../src/models/entities/message";
import { Project } from "../../../src/models/entities/project";
import { User } from "../../../src/models/entities/user";
import {
  CreateChatRequest,
  SendMessageRequest,
  UpdateChatRequest,
} from "../../../src/models/requests/chat";
import { ChatRepository } from "../../../src/repositories/chat";
import { DocumentRepository } from "../../../src/repositories/document";
import { DocumentChunkRepository } from "../../../src/repositories/document-chunk";
import { MessageRepository } from "../../../src/repositories/message";
import { OpenAiModelUsageRepository } from "../../../src/repositories/open-ai-model-usage";
import { ProjectRepository } from "../../../src/repositories/project";
import { UserRepository } from "../../../src/repositories/user";
import { aiService } from "../../../src/services/ai";
import { AssistantService } from "../../../src/services/assistant";
import { MockAssistantService } from "../../../src/services/assistant-mock";
import { AuthContext } from "../../../src/services/auth";
import { ChatService } from "../../../src/services/chat";
import {
  createTestPool,
  insertChats,
  insertDocuments,
  insertMessages,
  insertProjects,
  insertUsers,
  truncateChats,
  truncateUsers,
} from "../../utils";

describe("ChatService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const fileStorage = new FileStorage();
  const userRepository = new UserRepository(dataContext);
  const projectRepository = new ProjectRepository(dataContext);
  const chatRepository = new ChatRepository(dataContext);
  const messageRepository = new MessageRepository(dataContext);
  const documentRepository = new DocumentRepository(dataContext);
  const documentChunkRepository = new DocumentChunkRepository(dataContext);
  const openAiModelUsageRepository = new OpenAiModelUsageRepository(
    dataContext
  );
  const assistantService = new AssistantService(
    fileStorage,
    documentRepository,
    documentChunkRepository,
    openAiModelUsageRepository,
    new MockAssistantService(),
    aiService
  );
  const chatService = new ChatService(
    dataContext,
    fileStorage,
    userRepository,
    projectRepository,
    chatRepository,
    messageRepository,
    documentRepository,
    assistantService
  );

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
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

  const project: Project = {
    id: randomUUID(),
    title: "Project 1",
    description: "Project 1 Description",
    userId: mockUser.id,
    createdAt: mockUser.createdAt,
    updatedAt: new Date(),
  };

  const mockChats: Chat[] = Array.from({ length: 15 }, (_, index) => ({
    id: randomUUID(),
    title: `Chat ${index + 1}`,
    projectId: index === 0 ? project.id : null,
    userId: mockUser.id,
    createdAt: addDays(new Date(), -index),
    updatedAt: addDays(new Date(), -index),
  }));

  const mockDocuments: Document[] = [
    {
      id: randomUUID(),
      key: "test/to-learn-notes.txt",
      name: "To Learn Notes.txt",
      mimetype: "text/plain",
      sizeInBytes: 1024,
      isProcessed: true,
      chatId: mockChats[0].id,
      projectId: null,
      userId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      key: "test/to-learn-notes-backend.txt",
      name: "To Learn Notes Backend.txt",
      mimetype: "text/plain",
      sizeInBytes: 1024,
      isProcessed: false,
      chatId: mockChats[0].id,
      projectId: null,
      userId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const getDocumentChatMessages = (): Message[] => {
    const chat = mockChats[0];
    const document = mockDocuments[0];
    const chatMessages: Message[] = [];

    let message: Message = {
      id: randomUUID(),
      role: "user",
      content: [
        { type: "document", id: document.id, name: document.name },
        {
          type: "text",
          id: randomUUID(),
          text: "Can you summarize the content of my learning notes for this month?",
        },
      ],
      feedback: null,
      finishReason: null,
      parentMessageId: null,
      chatId: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    chatMessages.push(message);

    message = {
      id: randomUUID(),
      role: "assistant",
      content: [
        {
          type: "text",
          id: randomUUID(),
          text: "Sure! Let me take a look at your leaning notes first.",
        },
        {
          type: "tool-call",
          id: randomUUID(),
          name: "processDocument",
          input: { id: document.id, name: document.name },
          output: { success: true, data: mockDocuments[0].id },
        },
        {
          type: "tool-call",
          id: randomUUID(),
          name: "readDocument",
          input: { id: document.id, name: document.name, query: "" },
          output: {
            success: true,
            data: "<document-chunk>To learn this month:\n\n- [x] HTML\n- [x] CSS\n- [x] JavasScript\n- [ ] TypeScript\n- [ ] React\n- [ ] Next.js</document-chunk>",
          },
        },
        {
          type: "text",
          id: randomUUID(),
          text: "Based on your learning notes for this month, you have focused on web development technologies. You have completed learning HTML, CSS, and JavaScript. You are currently working on TypeScript and have plans to learn React and Next.js next.",
        },
      ],
      feedback: null,
      finishReason: "stop",
      parentMessageId: message.id,
      chatId: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    chatMessages.push(message);

    message = {
      id: randomUUID(),
      role: "user",
      content: [
        {
          type: "text",
          id: randomUUID(),
          text: "What is the next topic I should learn?",
        },
      ],
      feedback: null,
      finishReason: null,
      parentMessageId: message.id,
      chatId: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    chatMessages.push(message);

    message = {
      id: randomUUID(),
      role: "assistant",
      content: [
        {
          type: "text",
          id: randomUUID(),
          text: "Based on your current learning progress, the next topic you should learn is TypeScript. It will build upon your existing knowledge of JavaScript and provide you with strong typing capabilities, which are essential for modern web development.",
        },
      ],
      feedback: null,
      finishReason: "stop",
      parentMessageId: message.id,
      chatId: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    chatMessages.push(message);

    return chatMessages;
  };

  const mockMessages: Message[] = mockChats.flatMap((chat, chatIndex) => {
    if (chatIndex === 0) {
      return getDocumentChatMessages();
    }

    const userMessageId = randomUUID();

    return [
      {
        id: userMessageId,
        role: "user",
        content: [{ type: "text", id: randomUUID(), text: "Hello!" }],
        feedback: null,
        finishReason: null,
        parentMessageId: null,
        chatId: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
      {
        id: randomUUID(),
        role: "assistant",
        content: [
          {
            type: "text",
            id: randomUUID(),
            text: "Hi there! How can I help you today?",
          },
        ],
        feedback: null,
        finishReason: "stop",
        parentMessageId: userMessageId,
        chatId: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    ];
  });

  beforeAll(async () => {
    await Promise.all(
      mockDocuments.map((document) =>
        fileStorage.writeFile(
          document.key,
          document.mimetype,
          document.name === "To Learn Notes.txt"
            ? Buffer.from(
                "To learn this month:\n\n- [x] HTML\n- [x] CSS\n- [x] JavasScript\n- [ ] TypeScript\n- [ ] React\n- [ ] Next.js"
              )
            : Buffer.from(
                "To learn for Backend:\n\n- [ ] Node.js\n- [ ] Express\n- [ ] PostgreSQL\n"
              )
        )
      )
    );

    await insertUsers([mockUser], pool);
    await insertProjects([project], pool);
  });

  beforeEach(async () => {
    await insertChats(mockChats, pool);
    await insertDocuments(mockDocuments, pool);
    await insertMessages(mockMessages, pool);
  });

  afterEach(async () => {
    await truncateChats(pool);
  });

  afterAll(async () => {
    await fileStorage.deleteFiles(
      mockDocuments.map((document) => document.key)
    );

    await truncateUsers(pool);
    await pool.end();
  });

  describe("getChats", () => {
    it("should return user chats ordered by creation date desc paginated", async () => {
      const cursor = new Date();
      const limit = 10;

      const response = await chatService.getChats(
        { cursor: cursor.toISOString(), limit: limit.toString() },
        authContext
      );

      const sortedChats = [...mockChats].sort(
        (chatA, chatB) =>
          chatB.createdAt!.getTime() - chatA.createdAt!.getTime()
      );

      expect(response).toEqual({
        items: sortedChats.slice(0, limit),
        totalItems: sortedChats.length,
        nextCursor: sortedChats[limit].createdAt,
      });
    });
  });

  describe("getChat", () => {
    it("should return chat", async () => {
      const mockChat = mockChats[0];

      const response = await chatService.getChat(
        { chatId: mockChat.id },
        {},
        authContext
      );

      expect(response).toEqual(mockChat);
    });

    it("should return chat including project", async () => {
      const mockChat = mockChats[0];

      const response = await chatService.getChat(
        { chatId: mockChat.id },
        { expand: ["project"] },
        authContext
      );

      expect(response).toEqual({ ...mockChat, project });
    });
  });

  describe("getChatMessages", () => {
    it("should return chat messages ordered by creation date asc", async () => {
      const mockChat = mockChats[0];
      const mockChatMessages = mockMessages.filter(
        (message) => message.chatId === mockChat.id
      );

      const response = await chatService.getChatMessages(
        { chatId: mockChat.id },
        authContext
      );

      expect(response).toEqual({
        latestPath: mockChatMessages.map((message) => message.id),
        rootMessageIds: [mockChatMessages[0].id],
        messages: mockChatMessages.reduce((messagesMap, message) => {
          const messageCopy = { ...message, childrenMessageIds: [] };

          messagesMap[messageCopy.id] = messageCopy;

          if (messageCopy.parentMessageId != null) {
            messagesMap[messageCopy.parentMessageId].childrenMessageIds = [
              messageCopy.id,
            ];
          }

          return messagesMap;
        }, {} as Record<string, Message>),
      });
    });
  });

  describe("createChat", () => {
    it("should create a new chat and stream assistant response", async () => {
      const request: CreateChatRequest = {
        id: randomUUID(),
        message: [{ type: "text", id: randomUUID(), text: "Hello!" }],
      };

      let messageId = "";
      let finishReason: MessageFinishReason | null = null;

      const contentBlocks: AssistantContentBlock[] = [];
      const contentBlocksMap = new Map<string, AssistantContentBlock>();

      await chatService.createChat(request, authContext, (event) => {
        switch (event.event) {
          case "message-start": {
            messageId = event.data.messageId;

            break;
          }
          case "text-start": {
            contentBlocksMap.set(event.data.id, {
              type: "text",
              id: event.data.id,
              text: "",
            });

            break;
          }
          case "text-delta": {
            const contentBlock = contentBlocksMap.get(event.data.id);

            if (contentBlock != null && contentBlock.type === "text") {
              contentBlock.text += event.data.delta;
            }

            break;
          }
          case "text-end": {
            const contentBlock = contentBlocksMap.get(event.data.id);

            if (contentBlock != null && contentBlock.type === "text") {
              contentBlocks.push(contentBlock);
            }

            break;
          }
          case "tool-call-start": {
            contentBlocksMap.set(event.data.id, {
              type: "tool-call",
              id: event.data.id,
              name: event.data.name,
            } as ToolCallContentBlock);

            break;
          }
          case "tool-call-result": {
            const contentBlock = contentBlocksMap.get(event.data.id);

            if (contentBlock != null && contentBlock.type === "tool-call") {
              contentBlock.input = event.data.input;
              contentBlock.output = event.data.output;
            }

            break;
          }
          case "tool-call-end": {
            const contentBlock = contentBlocksMap.get(event.data.id);

            if (contentBlock != null && contentBlock.type === "tool-call") {
              contentBlocks.push(contentBlock);
            }

            break;
          }
          case "message-end": {
            finishReason = event.data.finishReason;

            break;
          }
        }
      });

      const databaseChat = await chatRepository.findOne({ id: request.id });

      if (databaseChat == null) {
        fail("Expected chat to be created");
      }

      const databaseMessages = await messageRepository.findAll({
        chatId: request.id,
      });

      expect(databaseChat).toEqual({
        id: request.id,
        title: expect.any(String),
        projectId: null,
        userId: mockUser.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(databaseMessages).toEqual(
        expect.arrayContaining([
          {
            id: expect.any(String),
            role: "user",
            content: request.message,
            feedback: null,
            finishReason: null,
            parentMessageId: null,
            chatId: request.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
          {
            id: messageId,
            role: "assistant",
            content: contentBlocks,
            feedback: null,
            finishReason: finishReason,
            parentMessageId: databaseMessages[0].id,
            chatId: request.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );
    }, 60000);
  });

  describe("sendMessage", () => {
    it("should send new message to existing chat and stream assistant response", async () => {
      const mockChat = mockChats[0];
      const mockChatMessages = mockMessages.filter(
        (message) => message.chatId === mockChat.id
      );

      const request: SendMessageRequest = {
        id: randomUUID(),
        content: [
          {
            type: "document",
            id: mockDocuments[1].id,
            name: mockDocuments[1].name,
          },
          {
            type: "text",
            id: randomUUID(),
            text: "Can you take a look on my notes for backend learning?",
          },
        ],
        parentMessageId: mockChatMessages[mockChatMessages.length - 1].id,
      };

      let messageId = "";
      let finishReason: MessageFinishReason | null = null;
      const contentBlocks: AssistantContentBlock[] = [];
      const contentBlocksMap = new Map<string, AssistantContentBlock>();

      await chatService.sendMessage(
        { chatId: mockChat.id },
        request,
        authContext,
        (event) => {
          switch (event.event) {
            case "message-start": {
              messageId = event.data.messageId;

              break;
            }
            case "text-start": {
              contentBlocksMap.set(event.data.id, {
                type: "text",
                id: event.data.id,
                text: "",
              });

              break;
            }
            case "text-delta": {
              const contentBlock = contentBlocksMap.get(event.data.id);

              if (contentBlock != null && contentBlock.type === "text") {
                contentBlock.text += event.data.delta;
              }

              break;
            }
            case "text-end": {
              const contentBlock = contentBlocksMap.get(event.data.id);

              if (contentBlock != null && contentBlock.type === "text") {
                contentBlocks.push(contentBlock);
              }

              break;
            }
            case "tool-call-start": {
              contentBlocksMap.set(event.data.id, {
                type: "tool-call",
                id: event.data.id,
                name: event.data.name,
              } as ToolCallContentBlock);

              break;
            }
            case "tool-call-result": {
              const contentBlock = contentBlocksMap.get(event.data.id);

              if (contentBlock != null && contentBlock.type === "tool-call") {
                contentBlock.input = event.data.input;
                contentBlock.output = event.data.output;
              }

              break;
            }
            case "tool-call-end": {
              const contentBlock = contentBlocksMap.get(event.data.id);

              if (contentBlock != null && contentBlock.type === "tool-call") {
                contentBlocks.push(contentBlock);
              }

              break;
            }
            case "message-end": {
              finishReason = event.data.finishReason;

              break;
            }
          }
        }
      );

      const databaseChat = await chatRepository.findOne({ id: mockChat.id });

      if (databaseChat == null) {
        fail("Expected chat to be found");
      }

      const databaseMessages = await messageRepository.findAll({
        chatId: mockChat.id,
      });

      expect(databaseMessages).toEqual(
        expect.arrayContaining([
          ...mockChatMessages,
          {
            id: request.id,
            role: "user",
            content: request.content,
            feedback: null,
            finishReason: null,
            parentMessageId: request.parentMessageId,
            chatId: mockChat.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
          {
            id: messageId,
            role: "assistant",
            content: contentBlocks,
            feedback: null,
            finishReason: finishReason,
            parentMessageId: request.id,
            chatId: mockChat.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );
    }, 60000);
  });

  describe("updateChat", () => {
    it("should update chat title and return its id", async () => {
      const mockChat = mockChats[1];

      const request: UpdateChatRequest = { title: "Updated Chat Title" };

      const response = await chatService.updateChat(
        { chatId: mockChat.id },
        request,
        authContext
      );

      const databaseChat = await chatRepository.findOne({ id: mockChat.id });

      expect(databaseChat).toEqual({
        ...mockChat,
        title: request.title,
        updatedAt: expect.any(Date),
      });

      expect(response).toEqual(mockChat.id);
    });
  });

  describe("updateMessage", () => {
    it("should update message feedback and return its id", async () => {
      const mockChat = mockChats[0];
      const mockMessage = mockMessages[1];

      const response = await chatService.updateMessage(
        { chatId: mockChat.id, messageId: mockMessage.id },
        { feedback: "like" },
        authContext
      );

      const databaseMessages = await messageRepository.findAll();

      expect(databaseMessages).toEqual(
        expect.arrayContaining(
          mockMessages.map((message) =>
            message.id === mockMessage.id
              ? { ...message, feedback: "like", updatedAt: expect.any(Date) }
              : message
          )
        )
      );

      expect(response).toEqual(mockMessage.id);
    });
  });

  describe("deleteChat", () => {
    it("should delete chat and return its id", async () => {
      const mockChat = mockChats[1];

      const response = await chatService.deleteChat(
        { chatId: mockChat.id },
        authContext
      );

      const databaseChats = await chatRepository.findAll();

      expect(databaseChats).toEqual(
        expect.arrayContaining(
          mockChats.filter((chat) => chat.id !== mockChat.id)
        )
      );

      expect(response).toEqual(mockChat.id);
    });
  });
});
