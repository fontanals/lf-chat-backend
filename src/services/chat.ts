import z from "zod";
import { IDataContext } from "../data/context";
import { Chat } from "../models/entities/chat";
import {
  Message,
  SearchDocumentsToolInput,
  SearchDocumentsToolOutput,
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
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<void>;
  sendMessage(
    params: SendMessageParams,
    request: SendMessageRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void
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
  private readonly chatRepository: IChatRepository;
  private readonly messageRepository: IMessageRepository;
  private readonly assistantService: IAssistantService;
  private readonly documentManager: IDocumentManager;

  constructor(
    dataContext: IDataContext,
    chatRepository: IChatRepository,
    messageRepository: IMessageRepository,
    assistantService: IAssistantService,
    documentManager: IDocumentManager
  ) {
    this.dataContext = dataContext;
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
    const cursor = getQueryDate(query.cursor, new Date());
    const limit = getQueryNumber(query.limit, 20);

    const paginatedChats = await this.chatRepository.findAllPaginated(
      cursor,
      limit,
      { title: search, userId: authContext.user.id }
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
    onSendEvent: (event: SendMessageEvent) => void
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

    const assistantMessage = await this.assistantService.sendMessage(
      [],
      userMessage,
      (messagePart) =>
        onSendEvent({
          event: messagePart.type,
          data: messagePart,
        } as SendMessageEvent),
      (input) => this.searchDocuments(input, chat.projectId!)
    );

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
    onSendEvent: (event: SendMessageEvent) => void
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

    const previousMessages = await this.messageRepository.findAll({
      chatId: params.chatId,
    });

    await this.messageRepository.create(userMessage);

    onSendEvent({ event: "start" });

    const assistantMessage = await this.assistantService.sendMessage(
      previousMessages,
      userMessage,
      (messagePart) =>
        onSendEvent({
          event: messagePart.type,
          data: messagePart,
        } as SendMessageEvent),
      (input) => this.searchDocuments(input, chat.projectId!)
    );

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
      console.log("CHAT NOT FOUND");
      throw ApplicationError.notFound();
    }

    const messageExists = await this.messageRepository.exists({
      id: params.messageId,
      chatId: params.chatId,
    });

    if (!messageExists) {
      console.log("MESSAGE NOT FOUND");
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
        await this.documentManager.searchRelevantDocumentChunks(
          input.query,
          chatId,
          projectId,
          true
        );

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
