import { randomUUID } from "crypto";
import { DataContext } from "../../../src/data/data-context";
import { FileStorage } from "../../../src/files/file-storage";
import { Chat } from "../../../src/models/entities/chat";
import {
  AssistantContentBlock,
  Message,
  MessageFinishReason,
  ToolCallContentBlock,
  UserMessage,
} from "../../../src/models/entities/message";
import { User } from "../../../src/models/entities/user";
import { DocumentRepository } from "../../../src/repositories/document";
import { DocumentChunkRepository } from "../../../src/repositories/document-chunk";
import { OpenAiModelUsageRepository } from "../../../src/repositories/open-ai-model-usage";
import { aiService } from "../../../src/services/ai";
import { AssistantService } from "../../../src/services/assistant";
import { MockAssistantService } from "../../../src/services/assistant-mock";
import { AuthContext } from "../../../src/services/auth";
import { Logger } from "../../../src/services/logger";
import { StringUtils } from "../../../src/utils/strings";
import {
  createTestPool,
  insertChats,
  insertMessages,
  insertUsers,
  truncateChats,
  truncateUsers,
} from "../../utils";

describe("AssistantService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const fileStorage = new FileStorage();
  const documentRepostory = new DocumentRepository(dataContext);
  const documentChunkRepository = new DocumentChunkRepository(dataContext);
  const openAiModelUsageRepository = new OpenAiModelUsageRepository(
    dataContext
  );
  const logger = new Logger();
  const assistantService = new AssistantService(
    fileStorage,
    documentRepostory,
    documentChunkRepository,
    openAiModelUsageRepository,
    new MockAssistantService(),
    aiService,
    logger
  );

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

  const mockChat: Chat = {
    id: randomUUID(),
    title: "New Chat",
    projectId: null,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let userMessageId = randomUUID();
  const mockMessages: Message[] = [
    {
      id: userMessageId,
      role: "user",
      content: [{ type: "text", id: randomUUID(), text: "Hello!" }],
      feedback: null,
      finishReason: null,
      parentMessageId: null,
      chatId: mockChat.id,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      chatId: mockChat.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeAll(async () => {
    await insertUsers([mockUser], pool);
  });

  beforeEach(async () => {
    await insertChats([mockChat], pool);
    await insertMessages(mockMessages, pool);
  });

  afterEach(async () => {
    await truncateChats(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("generateChatTitle", () => {
    it("should generate chat title", async () => {
      const title = await assistantService.generateChatTitle(mockMessages);

      expect(StringUtils.isNullOrWhitespace(title)).toBe(false);
    }, 30000);
  });

  describe("sendMessage", () => {
    it("should return assistant response and stream message parts", async () => {
      const userMessage: UserMessage = {
        id: randomUUID(),
        role: "user",
        content: [
          {
            type: "text",
            id: randomUUID(),
            text: "Can you help me creating a simple plan for studying web development?",
          },
        ],
        parentMessageId: mockMessages[1].id,
        chatId: mockChat.id,
      };

      let messageId = "";
      let finishReason: MessageFinishReason | null = null;

      const contentBlocks: AssistantContentBlock[] = [];
      const contentBlocksMap = new Map<string, AssistantContentBlock>();

      const assistantMessage = await assistantService.sendMessage(
        {
          previousMessages: mockMessages,
          userMessage,
          onMessagePart: (messagePart) => {
            switch (messagePart.type) {
              case "message-start": {
                messageId = messagePart.messageId;

                break;
              }
              case "text-start": {
                contentBlocksMap.set(messagePart.id, {
                  type: "text",
                  id: messagePart.id,
                  text: "",
                });

                break;
              }
              case "text-delta": {
                const contentBlock = contentBlocksMap.get(messagePart.id);

                if (contentBlock != null && contentBlock.type === "text") {
                  contentBlock.text += messagePart.delta;
                }

                break;
              }
              case "text-end": {
                const contentBlock = contentBlocksMap.get(messagePart.id);

                if (contentBlock != null) {
                  contentBlocks.push(contentBlock);
                }

                break;
              }
              case "tool-call-start": {
                contentBlocksMap.set(messagePart.id, {
                  type: "tool-call",
                  id: messagePart.id,
                  name: messagePart.name,
                } as ToolCallContentBlock);

                break;
              }
              case "tool-call-result": {
                const contentBlock = contentBlocksMap.get(messagePart.id);

                if (contentBlock != null && contentBlock.type === "tool-call") {
                  contentBlock.input = messagePart.input;
                  contentBlock.output = messagePart.output;
                }

                break;
              }
              case "tool-call-end": {
                const contentBlock = contentBlocksMap.get(messagePart.id);

                if (contentBlock != null) {
                  contentBlocks.push(contentBlock);
                }

                break;
              }
              case "message-end": {
                finishReason = messagePart.finishReason;

                break;
              }
            }
          },
        },
        authContext
      );

      expect(assistantMessage).toEqual({
        id: messageId,
        role: "assistant",
        content: contentBlocks,
        feedback: null,
        finishReason,
        parentMessageId: userMessage.id,
        chatId: userMessage.chatId,
      });
    }, 60000);
  });
});
