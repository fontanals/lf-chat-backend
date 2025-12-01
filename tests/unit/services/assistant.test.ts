import { randomUUID } from "crypto";
import { IFileStorage } from "../../../src/files/file-storage";
import { Document } from "../../../src/models/entities/document";
import {
  AssistantContentBlock,
  AssistantMessage,
  TextContentBlock,
  ToolCallContentBlock,
  UserMessage,
} from "../../../src/models/entities/message";
import { OpenAiModelUsage } from "../../../src/models/entities/open-ai-model-usage";
import { IDocumentRepository } from "../../../src/repositories/document";
import { IDocumentChunkRepository } from "../../../src/repositories/document-chunk";
import { IOpenAiModelUsageRepository } from "../../../src/repositories/open-ai-model-usage";
import { AiService } from "../../../src/services/ai";
import {
  AssistantService,
  IAssistantService,
} from "../../../src/services/assistant";
import { ILogger } from "../../../src/services/logger";
import { PromiseUtils } from "../../../src/utils/promises";

describe("AssistantService", () => {
  let fileStorage: jest.Mocked<IFileStorage>;
  let documentRepository: jest.Mocked<IDocumentRepository>;
  let documentChunkRepository: jest.Mocked<IDocumentChunkRepository>;
  let openAiModelUsageRepository: jest.Mocked<IOpenAiModelUsageRepository>;
  let mockAssistantService: jest.Mocked<IAssistantService>;
  let aiService: jest.Mocked<AiService>;
  let logger: ILogger;
  let assistantService: AssistantService;

  const mockOpenAiModelUsages: OpenAiModelUsage[] = [
    {
      model: "gpt-5-nano",
      inputTokens: 30000,
      outputTokens: 50000,
      totalTokens: 80000,
    },
    {
      model: "gpt-4o-mini",
      inputTokens: 17000,
      outputTokens: 23000,
      totalTokens: 40000,
    },
    {
      model: "text-embedding-3-small",
      inputTokens: 50000,
      outputTokens: 0,
      totalTokens: 50000,
    },
  ];

  const mockPastLimitOpenAiModelUsages: OpenAiModelUsage[] = [
    {
      model: "gpt-5-nano",
      inputTokens: 30000000,
      outputTokens: 64000000,
      totalTokens: 94000000,
    },
    {
      model: "gpt-4o-mini",
      inputTokens: 17000000,
      outputTokens: 38000000,
      totalTokens: 55000000,
    },
    {
      model: "text-embedding-3-small",
      inputTokens: 5000000,
      outputTokens: 0,
      totalTokens: 5000000,
    },
  ];

  beforeEach(() => {
    fileStorage = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      deleteFiles: jest.fn(),
    };

    documentRepository = {
      count: jest.fn(),
      exists: jest.fn(),
      findAll: jest.fn(),
      findAny: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getAllUserChatDocuments: jest.fn(),
    };

    documentChunkRepository = {
      findAll: jest.fn(),
      findRelevant: jest.fn(),
      createAll: jest.fn(),
    };

    openAiModelUsageRepository = {
      findAll: jest.fn(),
      update: jest.fn(),
    };

    mockAssistantService = {
      getStatus: jest.fn(),
      isContentValid: jest.fn(),
      generateChatTitle: jest.fn(),
      sendMessage: jest.fn(),
    };

    aiService = {
      embed: jest.fn(),
      generateObject: jest.fn(),
      streamText: jest.fn(),
      createModeration: jest.fn(),
    };

    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    assistantService = new AssistantService(
      fileStorage,
      documentRepository,
      documentChunkRepository,
      openAiModelUsageRepository,
      mockAssistantService,
      aiService,
      logger
    );
  });

  describe("getStatus", () => {
    it("should return 'mock' when global open ai model usage has reached limit", async () => {
      openAiModelUsageRepository.findAll.mockResolvedValue(
        mockPastLimitOpenAiModelUsages
      );

      const mode = await assistantService.getStatus();

      expect(mode).toBe("mock");
    });

    it("should return 'open-ai'", async () => {
      openAiModelUsageRepository.findAll.mockResolvedValue(
        mockOpenAiModelUsages
      );

      const mode = await assistantService.getStatus();

      expect(mode).toBe("open-ai");
    });
  });

  describe("isContentValid", () => {
    it("should return false when content is invalid", async () => {
      aiService.createModeration.mockResolvedValue({
        results: [{ flagged: true }],
      } as any);

      const isValid = await assistantService.isContentValid("");

      expect(isValid).toBe(false);
    });

    it("should return true when content is valid", async () => {
      aiService.createModeration.mockResolvedValue({
        results: [{ flagged: false }],
      } as any);

      const isValid = await assistantService.isContentValid("");

      expect(isValid).toBe(true);
    });
  });

  describe("generateChatTitle", () => {
    it("should generate title using mock assistant service when global open ai model usage has reached limit", async () => {
      openAiModelUsageRepository.findAll.mockResolvedValue(
        mockPastLimitOpenAiModelUsages
      );

      const mockTitle = "Mock Assistant Service Title";

      mockAssistantService.generateChatTitle.mockResolvedValue(mockTitle);

      const title = await assistantService.generateChatTitle([]);

      expect(title).toEqual(mockTitle);
    });

    it("should generate title", async () => {
      openAiModelUsageRepository.findAll.mockResolvedValue(
        mockOpenAiModelUsages
      );

      const mockTitle = "Ai Service Title";

      aiService.generateObject.mockResolvedValue({
        object: { title: mockTitle },
        usage: { inputTokens: 520, outputTokens: 10, totalTokens: 530 },
      } as any);

      const title = await assistantService.generateChatTitle([]);

      expect(title).toEqual(mockTitle);
    });
  });

  describe("sendMessage", () => {
    it("should send message using mock assistant service when global open ai model usage has reached limit", async () => {
      const chatId = randomUUID();

      const userMessage: UserMessage = {
        id: randomUUID(),
        role: "user",
        content: [{ type: "text", id: randomUUID(), text: "Hello!" }],
        parentMessageId: null,
        chatId,
      };

      const mockAssistantMessage: AssistantMessage = {
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
        parentMessageId: userMessage.id,
        chatId: userMessage.chatId,
      };

      openAiModelUsageRepository.findAll.mockResolvedValue(
        mockPastLimitOpenAiModelUsages
      );

      mockAssistantService.sendMessage.mockResolvedValue(mockAssistantMessage);

      const assistantMessage = await assistantService.sendMessage({
        previousMessages: [],
        userMessage: userMessage,
        onMessagePart: () => {},
      });

      expect(assistantMessage).toEqual(mockAssistantMessage);
    });

    it("should return content filtered assistant message when user message is flagged", async () => {
      const chatId = randomUUID();

      const userMessage: UserMessage = {
        id: randomUUID(),
        role: "user",
        content: [{ type: "text", id: randomUUID(), text: "Hello!" }],
        parentMessageId: null,
        chatId,
      };

      openAiModelUsageRepository.findAll.mockResolvedValue(
        mockOpenAiModelUsages
      );

      aiService.createModeration.mockResolvedValue({
        results: [{ flagged: true }],
      } as any);

      const assistantMessage = await assistantService.sendMessage({
        previousMessages: [],
        userMessage: userMessage,
        onMessagePart: () => {},
      });

      expect(assistantMessage).toEqual({
        id: expect.any(String),
        role: "assistant",
        content: [],
        feedback: null,
        finishReason: "content-filter",
        parentMessageId: userMessage.id,
        chatId: userMessage.chatId,
      });
    });

    it("should send message parts and return assistant message", async () => {
      const userId = randomUUID();
      const chatId = randomUUID();

      const document: Document = {
        id: randomUUID(),
        key: "",
        name: "october_expenses.txt",
        mimetype: "text/plain",
        sizeInBytes: 2048,
        isProcessed: false,
        chatId,
        projectId: null,
        userId,
      };

      const userMessage: UserMessage = {
        id: randomUUID(),
        role: "user",
        content: [
          { type: "document", id: document.id, name: document.name },
          {
            type: "text",
            id: randomUUID(),
            text: "Can you summarize my expenses?",
          },
        ],
        parentMessageId: null,
        chatId,
      };

      const mockContentBlocks: AssistantContentBlock[] = [
        {
          type: "text",
          id: randomUUID(),
          text: "Sure! Let me analyse your expenses notes first.",
        },
        {
          type: "tool-call",
          id: randomUUID(),
          name: "processDocument",
          input: { id: document.id, name: document.name },
          output: { success: true, data: document.id },
        },
        {
          type: "tool-call",
          id: randomUUID(),
          name: "readDocument",
          input: { id: document.id, name: document.name, query: "" },
          output: {
            success: true,
            data: "<document.chunk>...</document-chunk>",
          },
        },
        {
          type: "text",
          id: randomUUID(),
          text: "Based on the document, here is the summary of your expenses...",
        },
      ];

      openAiModelUsageRepository.findAll.mockResolvedValue(
        mockOpenAiModelUsages
      );

      aiService.createModeration.mockResolvedValue({
        results: [{ flagged: false }],
      } as any);

      aiService.streamText.mockReturnValue({
        fullStream: {
          async *[Symbol.asyncIterator]() {
            for (const contentBlock of mockContentBlocks) {
              switch (contentBlock.type) {
                case "text": {
                  const deltas = contentBlock.text.split(" ");

                  yield { type: "text-start", id: contentBlock.id };

                  await PromiseUtils.sleep(10);

                  for (let index = 0; index < deltas.length; index++) {
                    const delta = deltas[index];

                    yield {
                      type: "text-delta",
                      id: contentBlock.id,
                      text: index < deltas.length - 1 ? delta + " " : delta,
                    };

                    await PromiseUtils.sleep(10);
                  }

                  yield { type: "text-end", id: contentBlock.id };

                  await PromiseUtils.sleep(10);

                  break;
                }
                case "tool-call": {
                  const deltas = JSON.stringify(contentBlock.input).split(" ");

                  yield {
                    type: "tool-input-start",
                    id: contentBlock.id,
                    toolName: contentBlock.name,
                  };

                  await PromiseUtils.sleep(10);

                  for (let index = 0; index < deltas.length; index++) {
                    const delta = deltas[index];

                    yield {
                      type: "tool-input-delta",
                      id: contentBlock.id,
                      delta: index < deltas.length - 1 ? delta + " " : delta,
                    };

                    await PromiseUtils.sleep(10);
                  }

                  yield {
                    type: "tool-call",
                    toolCallId: contentBlock.id,
                    input: contentBlock.input,
                  };

                  await PromiseUtils.sleep(10);

                  yield {
                    type: "tool-result",
                    toolCallId: contentBlock.id,
                    input: contentBlock.input,
                    output: contentBlock.output,
                  };

                  await PromiseUtils.sleep(10);

                  break;
                }
              }
            }

            yield {
              type: "finish",
              finishReason: "stop",
              totalUsage: {
                inputTokens: 3288,
                outputTokens: 5732,
                totalTokens: 9020,
              },
            };
          },
        },
      } as any);

      let messageId = "";
      const contentBlocks: AssistantContentBlock[] = [];
      const contentBlocksMap = new Map<string, AssistantContentBlock>();

      const assistantMessage = await assistantService.sendMessage({
        previousMessages: [],
        userMessage: userMessage,
        onMessagePart: (messagePart) => {
          switch (messagePart.type) {
            case "message-start": {
              messageId = messagePart.messageId;

              expect(messagePart).toEqual({
                type: "message-start",
                messageId: expect.any(String),
              });

              break;
            }
            case "text-start": {
              contentBlocksMap.set(messagePart.id, {
                type: "text",
                id: messagePart.id,
                text: "",
              });

              expect(messagePart).toEqual({
                type: "text-start",
                id: expect.any(String),
                messageId: messageId,
              });

              break;
            }
            case "text-delta": {
              const contentBlock = contentBlocksMap.get(messagePart.id)!;

              (contentBlock as TextContentBlock).text += messagePart.delta;

              expect(messagePart).toEqual({
                type: "text-delta",
                id: contentBlock.id,
                delta: expect.any(String),
                messageId: messageId,
              });

              break;
            }
            case "text-end": {
              const contentBlock = contentBlocksMap.get(messagePart.id)!;

              contentBlocks.push(contentBlock);

              expect(messagePart).toEqual({
                type: "text-end",
                id: expect.any(String),
                messageId: messageId,
              });

              break;
            }
            case "tool-call-start": {
              contentBlocksMap.set(messagePart.id, {
                type: "tool-call",
                id: messagePart.id,
                name: messagePart.name,
              } as ToolCallContentBlock);

              expect(messagePart).toEqual({
                type: "tool-call-start",
                id: expect.any(String),
                name: expect.any(String),
                messageId: messageId,
              });

              break;
            }
            case "tool-call-delta": {
              expect(messagePart).toEqual({
                type: "tool-call-delta",
                id: expect.any(String),
                name: expect.any(String),
                delta: expect.any(String),
                messageId: messageId,
              });

              break;
            }
            case "tool-call": {
              const contentBlock = contentBlocksMap.get(messagePart.id)!;

              (contentBlock as ToolCallContentBlock).input = messagePart.input;

              if (messagePart.name === "processDocument") {
                const mockContentBlock =
                  mockContentBlocks[1] as ToolCallContentBlock;

                expect(messagePart).toEqual({
                  type: "tool-call",
                  id: mockContentBlock.id,
                  name: "processDocument",
                  input: mockContentBlock.input,
                  messageId: messageId,
                });
              }

              if (messagePart.name === "readDocument") {
                const mockContentBlock =
                  mockContentBlocks[2] as ToolCallContentBlock;

                expect(messagePart).toEqual({
                  type: "tool-call",
                  id: mockContentBlock.id,
                  name: "readDocument",
                  input: mockContentBlock.input,
                  messageId: messageId,
                });
              }

              break;
            }
            case "tool-call-result": {
              const contentBlock = contentBlocksMap.get(messagePart.id)!;

              (contentBlock as ToolCallContentBlock).input = messagePart.input;
              (contentBlock as ToolCallContentBlock).output =
                messagePart.output;

              if (messagePart.name === "processDocument") {
                const mockContentBlock =
                  mockContentBlocks[1] as ToolCallContentBlock;

                expect(messagePart).toEqual({
                  type: "tool-call-result",
                  id: mockContentBlock.id,
                  name: "processDocument",
                  input: mockContentBlock.input,
                  output: mockContentBlock.output,
                  messageId: messageId,
                });
              }

              if (messagePart.name === "readDocument") {
                const mockContentBlock =
                  mockContentBlocks[2] as ToolCallContentBlock;

                expect(messagePart).toEqual({
                  type: "tool-call-result",
                  id: mockContentBlock.id,
                  name: "readDocument",
                  input: mockContentBlock.input,
                  output: mockContentBlock.output,
                  messageId: messageId,
                });
              }

              break;
            }
            case "tool-call-end": {
              const contentBlock = contentBlocksMap.get(messagePart.id)!;

              contentBlocks.push(contentBlock);

              expect(messagePart).toEqual({
                type: "tool-call-end",
                id: expect.any(String),
                name: expect.any(String),
                messageId: messageId,
              });

              break;
            }
            case "message-end": {
              expect(messagePart).toEqual({
                type: "message-end",
                finishReason: "stop",
                messageId: messageId,
              });
            }
          }
        },
      });

      expect(contentBlocks).toEqual(mockContentBlocks);
      expect(assistantMessage).toEqual({
        id: messageId,
        role: "assistant",
        content: mockContentBlocks,
        feedback: null,
        finishReason: "stop",
        parentMessageId: userMessage.id,
        chatId: userMessage.chatId,
      });
    });
  });
});
