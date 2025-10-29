import z from "zod";
import { IDataContext } from "../data/context";
import { Chat } from "../models/entities/chat";
import { Document } from "../models/entities/document";
import {
  Message,
  SearchDocumentsToolInput,
  SearchDocumentsToolOutput,
  UserMessage,
} from "../models/entities/message";
import {
  CreateChatRequest,
  DeleteChatParams,
  GetChatMessagesParams,
  GetChatParams,
  GetChatsQuery,
  SendMessageParams,
  SendMessageRequest,
  UpdateChatParams,
  UpdateChatRequest,
  UpdateMessageParams,
  UpdateMessageRequest,
} from "../models/requests/chat";
import {
  DeleteChatResponse,
  GetChatMessagesResponse,
  GetChatResponse,
  GetChatsResponse,
  SendMessageEvent,
  UpdateChatResponse,
  UpdateMessageResponse,
} from "../models/responses/chat";
import { IChatRepository } from "../repositories/chat";
import { IMessageRepository } from "../repositories/message";
import { IUserRepository } from "../repositories/user";
import { ApplicationError } from "../utils/errors";
import {
  getQueryDate,
  getQueryNumber,
  getQueryString,
  validateRequest,
} from "../utils/express";
import { IAssistantService } from "./assistant";
import { AuthContext } from "./auth";
import { IDocumentManager } from "./document-manager";

export interface IChatService {
  getChats(
    query: GetChatsQuery,
    authContext: AuthContext
  ): Promise<GetChatsResponse>;
  getChat(
    params: GetChatParams,
    authContext: AuthContext
  ): Promise<GetChatResponse>;
  getChatMessages(
    params: GetChatMessagesParams,
    authContext: AuthContext
  ): Promise<GetChatMessagesResponse>;
  createChat(
    request: CreateChatRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void,
    abortSignal: AbortSignal
  ): Promise<void>;
  sendMessage(
    params: SendMessageParams,
    request: SendMessageRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void,
    abortSignal: AbortSignal
  ): Promise<void>;
  updateChat(
    params: UpdateChatParams,
    request: UpdateChatRequest,
    authContext: AuthContext
  ): Promise<UpdateChatResponse>;
  updateMessage(
    params: UpdateMessageParams,
    request: UpdateMessageRequest,
    authContext: AuthContext
  ): Promise<UpdateMessageResponse>;
  deleteChat(
    params: DeleteChatParams,
    authContext: AuthContext
  ): Promise<DeleteChatResponse>;
}

export class ChatService implements IChatService {
  private readonly dataContext: IDataContext;
  private readonly userRepository: IUserRepository;
  private readonly chatRepository: IChatRepository;
  private readonly messageRepository: IMessageRepository;
  private readonly assistantService: IAssistantService;
  private readonly documentManager: IDocumentManager;

  constructor(
    dataContext: IDataContext,
    userRepository: IUserRepository,
    chatRepository: IChatRepository,
    messageRepository: IMessageRepository,
    assistantService: IAssistantService,
    documentManager: IDocumentManager
  ) {
    this.dataContext = dataContext;
    this.userRepository = userRepository;
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.assistantService = assistantService;
    this.documentManager = documentManager;
  }

  async getChats(
    query: GetChatsQuery,
    authContext: AuthContext
  ): Promise<GetChatsResponse> {
    const search = getQueryString(query.search);
    const projectId = getQueryString(query.projectId);
    const cursor = getQueryDate(query.cursor, new Date());
    const limit = getQueryNumber(query.limit, 20);

    const paginatedChats = await this.chatRepository.findAllPaginated(
      cursor,
      limit,
      { title: search, projectId, userId: authContext.user.id }
    );

    return {
      items: paginatedChats.items,
      totalItems: paginatedChats.totalItems,
      nextCursor: paginatedChats.nextCursor?.toISOString(),
    };
  }

  async getChat(
    params: GetChatParams,
    authContext: AuthContext
  ): Promise<GetChatResponse> {
    const chat = await this.chatRepository.findOne({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (chat == null) {
      throw ApplicationError.notFound();
    }

    return chat;
  }

  async getChatMessages(
    params: GetChatMessagesParams,
    authContext: AuthContext
  ): Promise<GetChatMessagesResponse> {
    const chatExists = await this.chatRepository.exists({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (!chatExists) {
      throw ApplicationError.notFound();
    }

    const messages = await this.messageRepository.findAll({
      chatId: params.chatId,
    });

    const latestPath: string[] = [];
    const rootMessageIds: string[] = [];
    const messagesMap: Record<string, Message> = {};

    messages.forEach((message) => {
      message.childrenMessageIds = [];
      messagesMap[message.id] = message;

      if (message.parentMessageId != null) {
        const parentMessage = messagesMap[message.parentMessageId];

        if (parentMessage != null) {
          parentMessage.childrenMessageIds!.push(message.id);
        }
      } else {
        rootMessageIds.push(message.id);
      }
    });

    let currentMessage = messages[messages.length - 1] as Message | undefined;

    while (currentMessage != null) {
      latestPath.unshift(currentMessage.id);
      currentMessage =
        currentMessage.parentMessageId != null
          ? messagesMap[currentMessage.parentMessageId]
          : undefined;
    }

    return { latestPath, rootMessageIds, messages: messagesMap };
  }

  async createChat(
    request: CreateChatRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void,
    abortSignal: AbortSignal
  ): Promise<void> {
    validateRequest(
      request,
      z.object({
        id: z.string(),
        message: z.array(
          z.discriminatedUnion("type", [
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({
              type: z.literal("document"),
              id: z.string(),
              name: z.string(),
              mimetype: z.string(),
            }),
          ])
        ),
        projectId: z.string().nullable().optional(),
      })
    );

    const chat: Chat = {
      id: request.id,
      title: "New Chat",
      projectId: request.projectId,
      userId: authContext.user.id,
    };

    const userMessage: Message = {
      id: request.id,
      role: "user",
      content: request.message,
      parentMessageId: null,
      chatId: chat.id,
    };

    const isUserMessageValid = await this.assistantService.validateMessage(
      userMessage
    );

    if (!isUserMessageValid) {
      throw ApplicationError.userMessageViolatesContentPolicy();
    }

    const user = await this.userRepository.findOne({ id: authContext.user.id });

    let documentNames: string[] = [];

    if (request.projectId != null) {
      const projectDocuments = await this.documentManager.getDocuments({
        projectId: request.projectId,
      });

      documentNames = projectDocuments.map((document) => document.name);
    }

    try {
      await this.dataContext.begin();

      await this.chatRepository.create(chat);

      await this.messageRepository.create(userMessage);

      await this.dataContext.commit();
    } catch (error) {
      await this.dataContext.rollback();

      throw error;
    }

    onSendEvent({ event: "start" });

    const { success, documents: userMessageDocuments } =
      await this.processUserMessageDocuments(userMessage, onSendEvent);

    if (!success) {
      return onSendEvent({ event: "end" });
    }

    documentNames.push(
      ...userMessageDocuments.map((document) => document.name)
    );

    const assistantMessage = await this.assistantService.sendMessage({
      userCustomPrompt: user?.customPrompt,
      previousMessages: [],
      message: userMessage,
      documents: documentNames,
      onMessagePart: (messagePart) =>
        onSendEvent({
          event: messagePart.type,
          data: messagePart,
        } as SendMessageEvent),
      onSearchDocuments: (input) =>
        this.searchDocuments(input, chat.projectId!),
      abortSignal,
    });

    await this.messageRepository.create(assistantMessage);

    if (assistantMessage.finishReason === "stop") {
      const chatTitle = await this.assistantService.generateChatTitle([
        userMessage,
        assistantMessage,
      ]);

      await this.chatRepository.update(chat.id, { title: chatTitle });
    }

    onSendEvent({ event: "end" });
  }

  async sendMessage(
    params: SendMessageParams,
    request: SendMessageRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void,
    abortSignal: AbortSignal
  ): Promise<void> {
    validateRequest(
      request,
      z.object({
        id: z.string(),
        content: z.array(
          z.discriminatedUnion("type", [
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({
              type: z.literal("document"),
              id: z.string(),
              name: z.string(),
              mimetype: z.string(),
            }),
          ])
        ),
        parentMessageId: z.string().nullable().optional(),
      })
    );

    const chat = await this.chatRepository.findOne({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (chat == null) {
      throw ApplicationError.notFound();
    }

    const userMessage: Message = {
      id: request.id,
      role: "user",
      content: request.content,
      parentMessageId: request.parentMessageId,
      chatId: params.chatId,
    };

    const isUserMessageValid = await this.assistantService.validateMessage(
      userMessage
    );

    if (!isUserMessageValid) {
      throw ApplicationError.userMessageViolatesContentPolicy();
    }

    const user = await this.userRepository.findOne({ id: authContext.user.id });

    const previousMessages = await this.messageRepository.findAll({
      chatId: params.chatId,
    });

    const documents = await this.documentManager.getChatAndProjectDocuments(
      chat.id,
      chat.projectId
    );

    const documentNames = documents.map((document) => document.name);

    await this.messageRepository.create(userMessage);

    onSendEvent({ event: "start" });

    const { success, documents: userMessageDocuments } =
      await this.processUserMessageDocuments(userMessage, onSendEvent);

    if (!success) {
      return onSendEvent({ event: "end" });
    }

    documentNames.push(
      ...userMessageDocuments.map((document) => document.name)
    );

    const assistantMessage = await this.assistantService.sendMessage({
      userCustomPrompt: user?.customPrompt,
      previousMessages,
      message: userMessage,
      documents: documentNames,
      onMessagePart: (messagePart) =>
        onSendEvent({
          event: messagePart.type,
          data: messagePart,
        } as SendMessageEvent),
      onSearchDocuments: (input) =>
        this.searchDocuments(input, chat.projectId!),
      abortSignal,
    });

    await this.messageRepository.create(assistantMessage);

    if (assistantMessage.finishReason === "stop" && chat.title === "New Chat") {
      const chatTitle = await this.assistantService.generateChatTitle([
        userMessage,
        assistantMessage,
      ]);

      await this.chatRepository.update(chat.id, { title: chatTitle });
    }

    onSendEvent({ event: "end" });
  }

  async updateChat(
    params: UpdateChatParams,
    request: UpdateChatRequest,
    authContext: AuthContext
  ): Promise<UpdateChatResponse> {
    validateRequest(request, z.object({ title: z.string() }));

    const chatExists = await this.chatRepository.exists({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (!chatExists) {
      throw ApplicationError.notFound();
    }

    await this.chatRepository.update(params.chatId, { title: request.title });

    return params.chatId;
  }

  async updateMessage(
    params: UpdateMessageParams,
    request: UpdateMessageRequest,
    authContext: AuthContext
  ): Promise<UpdateMessageResponse> {
    validateRequest(
      request,
      z.object({
        feedback: z.enum(["like", "dislike", "neutral"]).nullable().optional(),
      })
    );

    const chatExists = await this.chatRepository.exists({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (!chatExists) {
      throw ApplicationError.notFound();
    }

    const messageExists = await this.messageRepository.exists({
      id: params.messageId,
      chatId: params.chatId,
    });

    if (!messageExists) {
      throw ApplicationError.notFound();
    }

    await this.messageRepository.update(params.messageId, {
      feedback: request.feedback,
    });

    return params.messageId;
  }

  async deleteChat(
    params: DeleteChatParams,
    authContext: AuthContext
  ): Promise<DeleteChatResponse> {
    const chatExists = await this.chatRepository.exists({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (!chatExists) {
      throw ApplicationError.notFound();
    }

    await this.chatRepository.delete(params.chatId);

    return params.chatId;
  }

  async processUserMessageDocuments(
    userMessage: UserMessage,
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<{ success: boolean; documents: Document[] }> {
    const result = { success: true, documents: [] as Document[] };

    const processDocumentPromises: Promise<
      { success: true; document: Document } | { success: false }
    >[] = [];

    for (const contentBlock of userMessage.content) {
      if (contentBlock.type === "document") {
        processDocumentPromises.push(
          this.processDocument(contentBlock.id, userMessage.chatId, onSendEvent)
        );
      }
    }

    const processDocumentResults = await Promise.all(processDocumentPromises);

    processDocumentResults.forEach((processDocumentResult) => {
      if (processDocumentResult.success) {
        result.documents.push(processDocumentResult.document);
      } else {
        result.success = false;
      }
    });

    return result;
  }

  async processDocument(
    documentId: string,
    chatId: string,
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<{ success: true; document: Document } | { success: false }> {
    try {
      const document = await this.documentManager.getDocument({
        id: documentId,
      });

      if (document == null) {
        throw new Error("Document not found.");
      }

      if (document.chatId == null && document.projectId == null) {
        await this.documentManager.processDocument(documentId);

        await this.documentManager.updateDocument(documentId, { chatId });
      }

      onSendEvent({
        event: "process-document",
        data: { success: true, id: document.id },
      });

      return { success: true, document: document };
    } catch (error) {
      onSendEvent({
        event: "process-document",
        data: {
          success: false,
          id: documentId,
          error: (error as Error).message,
        },
      });

      return { success: false };
    }
  }

  async searchDocuments(
    input: SearchDocumentsToolInput,
    chatId?: string,
    projectId?: string
  ): Promise<SearchDocumentsToolOutput> {
    if (chatId == null && projectId == null) {
      throw new Error(
        "Either chatId or projectId must be provided to search documents."
      );
    }

    try {
      const documentChunks =
        await this.documentManager.getRelevantDocumentChunks(input.query, 0.5, {
          chatId,
          projectId,
          includeDocument: true,
        });

      const data = documentChunks
        .map(
          (documentChunk) => `<documentChunk>
            <sourceDocumentName>${
              documentChunk.document!.name
            }</sourceDocumentName>
            <content>${documentChunk.content}</content>
          </documentChunk>`
        )
        .join("\n");

      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
