import { openai } from "@ai-sdk/openai";
import { ModelMessage, stepCountIs, tool } from "ai";
import { randomUUID } from "crypto";
import { startOfMonth } from "date-fns";
import parsePdf from "pdf-parse";
import z from "zod";
import { config } from "../config";
import { IFileStorage } from "../files/file-storage";
import { Document } from "../models/entities/document";
import { DocumentChunk } from "../models/entities/document-chunk";
import {
  AssistantContentBlock,
  AssistantMessage,
  Message,
  MessagePart,
  ProcessDocumentToolInput,
  ProcessDocumentToolOutput,
  ReadDocumentToolInput,
  ReadDocumentToolOutput,
  ToolCallContentBlock,
  ToolName,
  UserMessage,
} from "../models/entities/message";
import {
  OpenAiGlobalUsage,
  OpenAiModel,
  openAiModelCosts,
  OpenAiModelUsage,
} from "../models/entities/open-ai-model-usage";
import { Project } from "../models/entities/project";
import { IDocumentRepository } from "../repositories/document";
import { IDocumentChunkRepository } from "../repositories/document-chunk";
import { IOpenAiModelUsageRepository } from "../repositories/open-ai-model-usage";
import { StringUtils } from "../utils/strings";
import { AiService } from "./ai";
import { MockAssistantService } from "./assistant-mock";
import { ILogger } from "./logger";

export type AssistantMode = "open-ai" | "mock";

export type SendMessageOptions = {
  previousMessages: Message[];
  userMessage: UserMessage;
  userCustomPrompt?: string | null;
  project?: Project | null;
  documents?: Document[];
  onMessagePart: (messagePart: MessagePart) => void;
  abortSignal?: AbortSignal;
};

export interface IAssistantService {
  getMode(): Promise<AssistantMode>;
  generateChatTitle(messages: Message[]): Promise<string>;
  sendMessage(options: SendMessageOptions): Promise<AssistantMessage>;
}

export class AssistantService implements IAssistantService {
  private readonly fileStorage: IFileStorage;
  private readonly documentRepository: IDocumentRepository;
  private readonly documentChunkRepository: IDocumentChunkRepository;
  private readonly openAiModelUsageRepository: IOpenAiModelUsageRepository;
  private readonly mockAssistantService: MockAssistantService;
  private readonly aiService: AiService;
  private readonly logger: ILogger;

  constructor(
    fileStorage: IFileStorage,
    documentRepository: IDocumentRepository,
    documentChunkRepository: IDocumentChunkRepository,
    openAiModelUsageRepository: IOpenAiModelUsageRepository,
    mockAssistantService: MockAssistantService,
    aiService: AiService,
    logger: ILogger
  ) {
    this.fileStorage = fileStorage;
    this.documentRepository = documentRepository;
    this.documentChunkRepository = documentChunkRepository;
    this.openAiModelUsageRepository = openAiModelUsageRepository;
    this.mockAssistantService = mockAssistantService;
    this.aiService = aiService;
    this.logger = logger;
  }

  async getMode(): Promise<AssistantMode> {
    const openAiGlobalUsage = await this.getOpenAiGlobalUsage();

    const assistantMode =
      openAiGlobalUsage.totalCostInDollars >=
      config.OPENAI_MONTHLY_USAGE_LIMIT_IN_DOLLARS
        ? "mock"
        : "open-ai";

    return assistantMode;
  }

  async generateChatTitle(messages: Message[]): Promise<string> {
    const openAiGlobalUsage = await this.getOpenAiGlobalUsage();

    if (
      openAiGlobalUsage.totalCostInDollars >=
      config.OPENAI_MONTHLY_USAGE_LIMIT_IN_DOLLARS
    ) {
      return this.mockAssistantService.generateChatTitle(messages);
    }

    const modelMessages: ModelMessage[] = messages.map((message) => ({
      role: message.role,
      content: message.content.filter(
        (contentBlock) => contentBlock.type === "text"
      ),
    }));

    const result = await this.aiService.generateObject({
      model: openai(config.OPENAI_LOW_MODEL),
      system: `You are a title generator for chat conversations.
Your goal is to create a short, descriptive title of 2 to 5 words that summarizes the main topic or purpose of the conversation.

Guidelines:
Be specific and informative.
Use Title Case (capitalize major words).
Avoid unnecessary punctuation or filler words.
Express the core subject or intent clearly.
If the conversation is a question, phrase the title as a topic rather than a full question.`,
      schema: z.object({ title: z.string() }),
      prompt: modelMessages,
    });

    this.registerOpenAiModelUsage([
      {
        model: config.OPENAI_LOW_MODEL,
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
      },
    ]);

    return result.object.title;
  }

  async sendMessage(options: SendMessageOptions): Promise<AssistantMessage> {
    const openAiGlobalUsage = await this.getOpenAiGlobalUsage();

    if (
      openAiGlobalUsage.totalCostInDollars >=
      config.OPENAI_MONTHLY_USAGE_LIMIT_IN_DOLLARS
    ) {
      return this.mockAssistantService.sendMessage(options);
    }

    const openAiModelUsageData: OpenAiModelUsage[] = [];

    const response: AssistantMessage = {
      id: randomUUID(),
      role: "assistant",
      content: [],
      feedback: null,
      finishReason: "stop",
      parentMessageId: options.userMessage.id,
      chatId: options.userMessage.chatId,
    };

    let error: string | null = null;

    try {
      options.onMessagePart({ type: "message-start", messageId: response.id });

      if (
        options.userMessage.content.some(
          (contentBlock) =>
            contentBlock.type === "text" &&
            !StringUtils.isNullOrWhitespace(contentBlock.text)
        )
      ) {
        const moderation = await this.aiService.createModeration({
          model: "omni-moderation-latest",
          input: options.userMessage.content
            .filter((contentBlock) => contentBlock.type === "text")
            .map((contentBlock) => contentBlock.text)
            .join("\n"),
        });

        if (moderation.results.some((result) => result.flagged)) {
          response.finishReason = "content-filter";

          options.onMessagePart({
            type: "message-end",
            messageId: response.id,
            finishReason: "content-filter",
          });

          return response;
        }
      }

      const result = this.aiService.streamText({
        model: openai(config.OPENAI_MAIN_MODEL),
        system: this.getSystemPrompt(options),
        prompt: this.getModelMessages(options),
        tools: this.getTools(options, openAiModelUsageData),
        stopWhen: stepCountIs(10),
        abortSignal: options.abortSignal,
      });

      const contentBlocks = new Map<string, AssistantContentBlock>();

      for await (const part of result.fullStream) {
        switch (part.type) {
          case "text-start": {
            contentBlocks.set(part.id, { type: "text", id: part.id, text: "" });

            options.onMessagePart({
              type: "text-start",
              id: part.id,
              messageId: response.id,
            });

            break;
          }
          case "text-delta": {
            const contentBlock = contentBlocks.get(part.id);

            if (contentBlock != null && contentBlock.type === "text") {
              contentBlock.text += part.text;

              options.onMessagePart({
                type: "text-delta",
                id: part.id,
                delta: part.text,
                messageId: response.id,
              });
            }

            break;
          }
          case "text-end": {
            const contentBlock = contentBlocks.get(part.id);

            if (contentBlock != null && contentBlock.type === "text") {
              response.content.push(contentBlock);

              options.onMessagePart({
                type: "text-end",
                id: part.id,
                messageId: response.id,
              });
            }

            break;
          }
          case "tool-input-start": {
            contentBlocks.set(part.id, {
              type: "tool-call",
              id: part.id,
              name: part.toolName as ToolName,
            } as ToolCallContentBlock);

            options.onMessagePart({
              type: "tool-call-start",
              id: part.id,
              name: part.toolName as ToolName,
              messageId: response.id,
            });

            break;
          }
          case "tool-input-delta": {
            const contentBlock = contentBlocks.get(part.id);

            if (
              contentBlock != null &&
              contentBlock.type === "tool-call" &&
              contentBlock.name === "processDocument"
            ) {
              options.onMessagePart({
                type: "tool-call-delta",
                id: part.id,
                name: "processDocument",
                delta: part.delta,
                messageId: response.id,
              });
            }

            if (
              contentBlock != null &&
              contentBlock.type === "tool-call" &&
              contentBlock.name === "readDocument"
            ) {
              options.onMessagePart({
                type: "tool-call-delta",
                id: part.id,
                name: "readDocument",
                delta: part.delta,
                messageId: response.id,
              });
            }

            break;
          }
          case "tool-call": {
            const contentBlock = contentBlocks.get(part.toolCallId);

            if (
              contentBlock != null &&
              contentBlock.type === "tool-call" &&
              contentBlock.name === "processDocument"
            ) {
              contentBlock.input = part.input as ProcessDocumentToolInput;

              options.onMessagePart({
                type: "tool-call",
                id: part.toolCallId,
                name: "processDocument",
                input: part.input as ProcessDocumentToolInput,
                messageId: response.id,
              });
            }

            if (
              contentBlock != null &&
              contentBlock.type === "tool-call" &&
              contentBlock.name === "readDocument"
            ) {
              contentBlock.input = part.input as ReadDocumentToolInput;

              options.onMessagePart({
                type: "tool-call",
                messageId: response.id,
                id: part.toolCallId,
                name: "readDocument",
                input: part.input as ReadDocumentToolInput,
              });
            }

            break;
          }
          case "tool-result": {
            const contentBlock = contentBlocks.get(part.toolCallId);

            if (
              contentBlock != null &&
              contentBlock.type === "tool-call" &&
              contentBlock.name === "processDocument"
            ) {
              contentBlock.input = part.input as ProcessDocumentToolInput;
              contentBlock.output = part.output as ProcessDocumentToolOutput;

              response.content.push(contentBlock);

              options.onMessagePart({
                type: "tool-call-result",
                id: part.toolCallId,
                name: "processDocument",
                input: part.input as ProcessDocumentToolInput,
                output: part.output as ProcessDocumentToolOutput,
                messageId: response.id,
              });

              options.onMessagePart({
                type: "tool-call-end",
                id: part.toolCallId,
                name: "processDocument",
                messageId: response.id,
              });
            }

            if (
              contentBlock != null &&
              contentBlock.type === "tool-call" &&
              contentBlock.name === "readDocument"
            ) {
              contentBlock.input = part.input as ReadDocumentToolInput;
              contentBlock.output = part.output as ReadDocumentToolOutput;

              response.content.push(contentBlock);

              options.onMessagePart({
                type: "tool-call-result",
                id: part.toolCallId,
                name: "readDocument",
                input: part.input as ReadDocumentToolInput,
                output: part.output as ReadDocumentToolOutput,
                messageId: response.id,
              });

              options.onMessagePart({
                type: "tool-call-end",
                id: part.toolCallId,
                name: "readDocument",
                messageId: response.id,
              });
            }

            break;
          }
          case "abort": {
            response.finishReason = "interrupted";

            break;
          }
          case "error": {
            response.finishReason = "error";
            error = (part.error as Error).message;

            break;
          }
          case "finish": {
            response.finishReason = part.finishReason;

            openAiModelUsageData.push({
              model: config.OPENAI_MAIN_MODEL,
              inputTokens: part.totalUsage.inputTokens ?? 0,
              outputTokens: part.totalUsage.outputTokens ?? 0,
              totalTokens: part.totalUsage.totalTokens ?? 0,
            });

            break;
          }
        }
      }
    } catch (error) {
      response.finishReason = "error";
      error = (error as Error).message;
    }

    if (response.finishReason !== "error") {
      options.onMessagePart({
        type: "message-end",
        finishReason: response.finishReason,
        messageId: response.id,
      });
    } else {
      options.onMessagePart({
        type: "message-end",
        finishReason: "error",
        error: error!,
        messageId: response.id,
      });
    }

    this.registerOpenAiModelUsage(openAiModelUsageData);

    return response;
  }

  getSystemPrompt(options: SendMessageOptions) {
    const documentsSection =
      options.documents && options.documents.length > 0
        ? `## Document Context

The user has uploaded ${
            options.documents.length
          } document(s) to this conversation:
${options.documents
  .map(
    (document) =>
      `- ID: ${document.id} - NAME: ${document.name} - MIMETYPE: ${
        document.mimetype
      } - ${
        document.isProcessed ? "PROCESSED" : "NOT PROCESSED (NEEDS PROCESSING)"
      }`
  )
  .join("\n")}

When the user references these documents or asks questions about them:
1. **Check processing status first**: 
   - If a document shows "NOT PROCESSED", you MUST use the 'processDocument' tool before you can search it
   - If a document shows "PROCESSED", you can directly use 'readDocument' on it
2. Use the 'readDocument' tool to find relevant information within processed documents
3. Always cite which document you're referencing when providing information
4. Be transparent about what comes from the documents versus your general knowledge

Document chunks will be provided in XML format:
<document-chunk>content here</document-chunk>

Quote or paraphrase relevant sections when answering.`
        : "";

    const projectSection = options.project
      ? `## Project Context

This conversation is part of the project: "${options.project.title}"
${
  options.project.description
    ? `\nProject Description: ${options.project.description}`
    : ""
}

Keep this project context in mind and maintain consistency with the project's goals.`
      : "";

    const userCustomPromptSection = options.userCustomPrompt
      ? `## User Preferences

The user has provided these custom instructions:

${options.userCustomPrompt}

Follow these instructions while maintaining helpfulness and accuracy.`
      : "";

    return `You are a helpful AI assistant. Your goal is to provide accurate, helpful, and friendly responses to user queries.

${userCustomPromptSection}

${projectSection}

${documentsSection}

## Tool Usage

You have access to these tools:

**processDocument**: Extracts and indexes document content (call once per unprocessed document)
- Input: { documentId: string }
- Only use this on documents marked as "NOT PROCESSED"
- After processing, the document becomes searchable

**readDocument**: Finds specific information within a processed document using semantic search
- Input: { documentId: string, query: string }
- Only works on documents marked as "PROCESSED ✓"
- Use targeted, specific queries for best results
- May need multiple searches with different queries to find all relevant information

Use these tools proactively when users ask about uploaded documents.

## Response Guidelines

- Be concise but complete
- Be accurate - admit uncertainty rather than guessing
- Use markdown formatting for readability
- Handle tool errors gracefully
- Cite sources when using document content
- Maintain a friendly, professional tone`;
  }

  getModelMessages(options: SendMessageOptions) {
    const modelMessages: ModelMessage[] = options.previousMessages
      .concat(options.userMessage)
      .flatMap((message) => {
        if (message.role === "user") {
          return [
            {
              role: "user",
              content: message.content.map((contentBlock) => {
                switch (contentBlock.type) {
                  case "text":
                    return contentBlock;
                  case "document":
                    return {
                      type: "text",
                      text: `File upload: ${contentBlock.name}`,
                    };
                }
              }),
            },
          ];
        }

        const assistantModelMessages: ModelMessage[] = [];

        let currentModelMessage: ModelMessage | null = null;

        message.content.forEach((contentBlock) => {
          if (currentModelMessage == null) {
            currentModelMessage = { role: "assistant", content: [] };
          } else if (currentModelMessage.role === "tool") {
            assistantModelMessages.push(currentModelMessage);

            currentModelMessage = { role: "assistant", content: [] };
          }

          if (
            contentBlock.type === "text" &&
            currentModelMessage.role === "assistant" &&
            Array.isArray(currentModelMessage.content)
          ) {
            currentModelMessage.content.push(contentBlock);
          }

          if (
            contentBlock.type === "tool-call" &&
            currentModelMessage.role === "assistant" &&
            Array.isArray(currentModelMessage.content)
          ) {
            currentModelMessage.content.push({
              type: "tool-call",
              toolCallId: contentBlock.id,
              toolName: contentBlock.name,
              input: contentBlock.input,
            });

            assistantModelMessages.push(currentModelMessage);

            currentModelMessage = {
              role: "tool",
              content: [
                {
                  type: "tool-result",
                  toolCallId: contentBlock.id,
                  toolName: contentBlock.name,
                  output: { type: "json", value: contentBlock.output },
                },
              ],
            };
          }
        });

        if (currentModelMessage != null) {
          assistantModelMessages.push(currentModelMessage);
        }

        return assistantModelMessages;
      });

    return modelMessages;
  }

  getTools(
    options: SendMessageOptions,
    openAiModelUsageData: OpenAiModelUsage[]
  ) {
    const tools = {
      processDocument: tool({
        name: "processDocument",
        description:
          "Processes an uploaded document to extract and index its content for future retrieval. Returns the document ID.",
        inputSchema: z.object({ id: z.string(), name: z.string() }),
        outputSchema: z.discriminatedUnion("success", [
          z.object({ success: z.literal(true), data: z.string() }),
          z.object({ success: z.literal(false), error: z.string() }),
        ]),
        execute: (input) =>
          this.processDocument(
            input,
            options.userMessage.chatId,
            openAiModelUsageData
          ),
      }),
      readDocument: tool({
        name: "readDocument",
        description:
          "Searches the provided document for relevant information based on a string query. Returns document chunks in XML format.",
        inputSchema: z.object({
          id: z.string(),
          name: z.string(),
          query: z.string(),
        }),
        outputSchema: z.discriminatedUnion("success", [
          z.object({ success: z.literal(true), data: z.string() }),
          z.object({ success: z.literal(false), error: z.string() }),
        ]),
        execute: (input) => this.readDocument(input, openAiModelUsageData),
      }),
    };

    return tools;
  }

  async processDocument(
    input: ProcessDocumentToolInput,
    chatId: string,
    openAiModelUsageData: OpenAiModelUsage[]
  ): Promise<ProcessDocumentToolOutput> {
    try {
      const document = await this.documentRepository.findOne({ id: input.id });

      if (document == null) {
        throw new Error("Document not found.");
      }

      if (document.isProcessed) {
        throw new Error("Document is already processed.");
      }

      const textContent = await this.getDocumentTextContent(document);

      if (StringUtils.isNullOrWhitespace(textContent)) {
        throw new Error("Document has no text content.");
      }

      const moderation = await this.aiService.createModeration({
        model: "omni-moderation-latest",
        input: textContent,
      });

      if (moderation.results.some((result) => result.flagged)) {
        throw new Error("Document content violates content policy.");
      }

      const documentChunks = await this.chunkDocumentTextContent(
        document.id,
        textContent
      );

      const generateEmbeddingPromises = documentChunks.map(
        async (documentChunk) => {
          const result = await this.aiService.embed({
            model: openai.textEmbeddingModel("text-embedding-3-small"),
            value: documentChunk.content,
          });

          openAiModelUsageData.push({
            model: "text-embedding-3-small",
            inputTokens: result.usage.tokens ?? 0,
            outputTokens: 0,
            totalTokens: result.usage.tokens ?? 0,
          });

          documentChunk.embedding = result.embedding;
        }
      );

      await Promise.all(generateEmbeddingPromises);

      await this.documentChunkRepository.createAll(documentChunks);

      await this.documentRepository.update(document.id, {
        isProcessed: true,
        chatId: document.projectId == null ? chatId : undefined,
      });

      return { success: true, data: document.id };
    } catch (error) {
      this.logger.error("Error processing document: ", error);

      return { success: false, error: (error as Error).message };
    }
  }

  async readDocument(
    input: ReadDocumentToolInput,
    openAiModelUsageData: OpenAiModelUsage[]
  ): Promise<ReadDocumentToolOutput> {
    try {
      const document = await this.documentRepository.findOne({ id: input.id });

      if (document == null) {
        throw new Error("Document not found.");
      }

      if (!document.isProcessed) {
        throw new Error("Document is not processed yet.");
      }

      let documentChunks: DocumentChunk[];

      if (!StringUtils.isNullOrWhitespace(input.query)) {
        const embeddingResult = await this.aiService.embed({
          model: openai.textEmbeddingModel("text-embedding-3-small"),
          value: input.query,
        });

        openAiModelUsageData.push({
          model: "text-embedding-3-small",
          inputTokens: embeddingResult.usage.tokens ?? 0,
          outputTokens: 0,
          totalTokens: embeddingResult.usage.tokens ?? 0,
        });

        documentChunks = await this.documentChunkRepository.findRelevant(
          embeddingResult.embedding,
          5,
          { documentId: input.id }
        );
      } else {
        documentChunks = await this.documentChunkRepository.findAll({
          documentId: input.id,
          limit: 5,
        });
      }

      const data = documentChunks
        .map(
          (documentChunk) =>
            `<document-chunk>${documentChunk.content}</document-chunk>`
        )
        .join("\n");

      return { success: true, data };
    } catch (error) {
      this.logger.error("Error reading document: ", error);

      return { success: false, error: (error as Error).message };
    }
  }

  async getDocumentTextContent(document: Document): Promise<string> {
    const content = await this.fileStorage.readFile(document.key);

    let textContent = "";

    switch (document.mimetype) {
      case "text/plain": {
        textContent = content.toString("utf-8");

        break;
      }
      case "application/pdf": {
        const pdf = await parsePdf(content);

        textContent = pdf.text;

        break;
      }
    }

    return textContent;
  }

  async chunkDocumentTextContent(
    documentId: string,
    content: string
  ): Promise<DocumentChunk[]> {
    const words = content.split(/\s+/).filter(Boolean);

    const documentChunks: DocumentChunk[] = [];

    let index = 0;

    while (index < words.length) {
      const end = index + config.CHUNK_SIZE;

      const documentChunk: DocumentChunk = {
        id: randomUUID(),
        index: documentChunks.length,
        content: words.slice(index, end).join(" "),
        embedding: [],
        documentId,
      };

      documentChunks.push(documentChunk);

      index += config.CHUNK_SIZE - config.CHUNK_OVERLAP;
    }

    return documentChunks;
  }

  async getOpenAiGlobalUsage(): Promise<OpenAiGlobalUsage> {
    const openAiGlobalUsage: OpenAiGlobalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCostInDollars: 0,
    };

    const openAiModelUsages = await this.openAiModelUsageRepository.findAll();

    for (const openAiModelUsage of openAiModelUsages) {
      if (
        startOfMonth(new Date()) > startOfMonth(openAiModelUsage.updatedAt!)
      ) {
        continue;
      }

      openAiGlobalUsage.inputTokens += openAiModelUsage.inputTokens;
      openAiGlobalUsage.outputTokens += openAiModelUsage.outputTokens;
      openAiGlobalUsage.totalTokens += openAiModelUsage.totalTokens;

      const inputTokensCostInDollars =
        openAiModelUsage.inputTokens *
        openAiModelCosts[openAiModelUsage.model].inputTokenCostInDollars;
      const outputTokensCostInDollars =
        openAiModelUsage.outputTokens *
        openAiModelCosts[openAiModelUsage.model].outputTokenCostInDollars;

      openAiGlobalUsage.totalCostInDollars +=
        inputTokensCostInDollars + outputTokensCostInDollars;
    }

    return openAiGlobalUsage;
  }

  async registerOpenAiModelUsage(
    openAiModelUsageData: OpenAiModelUsage[]
  ): Promise<void> {
    try {
      const openAiModelUsageMap: Map<OpenAiModel, OpenAiModelUsage> = new Map();

      openAiModelUsageData.forEach((openAiModelUsage) => {
        const existingOpenAiModelUsage = openAiModelUsageMap.get(
          openAiModelUsage.model
        );

        if (existingOpenAiModelUsage != null) {
          existingOpenAiModelUsage.inputTokens += openAiModelUsage.inputTokens;
          existingOpenAiModelUsage.outputTokens +=
            openAiModelUsage.outputTokens;
          existingOpenAiModelUsage.totalTokens += openAiModelUsage.totalTokens;
        } else {
          openAiModelUsageMap.set(openAiModelUsage.model, {
            ...openAiModelUsage,
          });
        }
      });

      for (const openAiModelUsage of openAiModelUsageMap.values()) {
        await this.openAiModelUsageRepository.update(openAiModelUsage);
      }
    } catch (error) {
      this.logger.error("Error registering OpenAI model usage: ", error);
    }
  }
}
