import z from "zod";
import { IDataContext } from "../data/data-context";
import { IFileStorage } from "../files/file-storage";
import { Chat } from "../models/entities/chat";
import { Message, UserMessage } from "../models/entities/message";
import { Project } from "../models/entities/project";
import {
  CreateChatRequest,
  DeleteChatParams,
  GetChatMessagesParams,
  GetChatParams,
  GetChatQuery,
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
  GetAssistantModeResponse,
  GetChatMessagesResponse,
  GetChatResponse,
  GetChatsResponse,
  SendMessageEvent,
  UpdateChatResponse,
  UpdateMessageResponse,
} from "../models/responses/chat";
import { IChatRepository } from "../repositories/chat";
import { IDocumentRepository } from "../repositories/document";
import { IMessageRepository } from "../repositories/message";
import { IProjectRepository } from "../repositories/project";
import { IUserRepository } from "../repositories/user";
import { ApplicationError } from "../utils/errors";
import {
  getQueryDate,
  getQueryNumber,
  getQueryString,
  getQueryStringArray,
  validateRequest,
} from "../utils/express";
import { IAssistantService } from "./assistant";
import { AuthContext } from "./auth";
import { ArrayUtils } from "../utils/arrays";

export interface IChatService {
  getAssistantMode(): Promise<GetAssistantModeResponse>;
  getChats(
    query: GetChatsQuery,
    authContext: AuthContext
  ): Promise<GetChatsResponse>;
  getChat(
    params: GetChatParams,
    query: GetChatQuery,
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
    abortSignal?: AbortSignal
  ): Promise<void>;
  sendMessage(
    params: SendMessageParams,
    request: SendMessageRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void,
    abortSignal?: AbortSignal
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
  private readonly fileStorage: IFileStorage;
  private readonly userRepository: IUserRepository;
  private readonly projectRepository: IProjectRepository;
  private readonly chatRepository: IChatRepository;
  private readonly messageRepository: IMessageRepository;
  private readonly documentRepository: IDocumentRepository;
  private readonly assistantService: IAssistantService;

  constructor(
    dataContext: IDataContext,
    fileStorage: IFileStorage,
    userRepository: IUserRepository,
    projectRepository: IProjectRepository,
    chatRepository: IChatRepository,
    messageRepository: IMessageRepository,
    documentRepository: IDocumentRepository,
    assistantService: IAssistantService
  ) {
    this.dataContext = dataContext;
    this.fileStorage = fileStorage;
    this.userRepository = userRepository;
    this.projectRepository = projectRepository;
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.documentRepository = documentRepository;
    this.assistantService = assistantService;
  }

  async getAssistantMode(): Promise<GetAssistantModeResponse> {
    const assistantMode = this.assistantService.getMode();

    return assistantMode;
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

    return paginatedChats;
  }

  async getChat(
    params: GetChatParams,
    query: GetChatQuery,
    authContext: AuthContext
  ): Promise<GetChatResponse> {
    const expand = getQueryStringArray(query.expand);

    const chat = await this.chatRepository.findOne({
      id: params.chatId,
      userId: authContext.user.id,
      includeProject: expand?.includes("project"),
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
    abortSignal?: AbortSignal
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

    const userMessage: UserMessage = {
      id: request.id,
      role: "user",
      content: request.message,
      parentMessageId: null,
      chatId: chat.id,
    };

    const user = await this.userRepository.findOne({ id: authContext.user.id });

    let project: Project | null = null;

    if (request.projectId != null) {
      project = await this.projectRepository.findOne({ id: request.projectId });
    }

    const messageDocumentIds = request.message
      .filter((contentBlock) => contentBlock.type === "document")
      .map((contentBlock) => contentBlock.id);

    const documents = await this.documentRepository.findAny({
      chatId: chat.id,
      projectId: request.projectId,
      ids: messageDocumentIds,
    });

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

    const assistantMessage = await this.assistantService.sendMessage({
      previousMessages: [],
      userMessage: userMessage,
      userCustomPrompt: user?.customPrompt,
      project,
      documents,
      onMessagePart: (messagePart) =>
        onSendEvent({
          event: messagePart.type,
          data: messagePart,
        } as SendMessageEvent),
      abortSignal,
    });

    await this.messageRepository.create(assistantMessage);

    if (assistantMessage.finishReason === "stop") {
      const title = await this.assistantService.generateChatTitle([
        userMessage,
        assistantMessage,
      ]);

      await this.chatRepository.update(chat.id, { title });
    }

    onSendEvent({ event: "end" });
  }

  async sendMessage(
    params: SendMessageParams,
    request: SendMessageRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void,
    abortSignal?: AbortSignal
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
            }),
          ])
        ),
        parentMessageId: z.string().nullable().optional(),
      })
    );

    const chat = await this.chatRepository.findOne({
      id: params.chatId,
      userId: authContext.user.id,
      includeProject: true,
    });

    if (chat == null) {
      throw ApplicationError.notFound();
    }

    const userMessage: UserMessage = {
      id: request.id,
      role: "user",
      content: request.content,
      parentMessageId: request.parentMessageId,
      chatId: params.chatId,
    };

    const user = await this.userRepository.findOne({ id: authContext.user.id });

    const previousMessages = await this.messageRepository.findAll({
      chatId: params.chatId,
    });

    const messageDocumentIds = request.content
      .filter((contentBlock) => contentBlock.type === "document")
      .map((contentBlock) => contentBlock.id);

    const documents = await this.documentRepository.findAny({
      chatId: chat.id,
      projectId: chat.projectId,
      ids: messageDocumentIds,
    });

    await this.messageRepository.create(userMessage);

    onSendEvent({ event: "start" });

    const assistantMessage = await this.assistantService.sendMessage({
      previousMessages,
      userMessage: userMessage,
      userCustomPrompt: user?.customPrompt,
      project: chat.project,
      documents,
      onMessagePart: (messagePart) =>
        onSendEvent({
          event: messagePart.type,
          data: messagePart,
        } as SendMessageEvent),
      abortSignal,
    });

    await this.messageRepository.create(assistantMessage);

    if (assistantMessage.finishReason === "stop" && chat.title === "New Chat") {
      const title = await this.assistantService.generateChatTitle([
        userMessage,
        assistantMessage,
      ]);

      await this.chatRepository.update(chat.id, { title });
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

    const documents = await this.documentRepository.findAll({
      chatId: params.chatId,
    });

    if (!ArrayUtils.isNullOrEmpty(documents)) {
      await this.fileStorage.deleteFiles(
        documents.map((document) => document.key)
      );
    }

    await this.chatRepository.delete(params.chatId);

    return params.chatId;
  }
}
