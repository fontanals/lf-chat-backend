import { randomUUID } from "crypto";
import z from "zod";
import { IDataContext } from "../data/context";
import { Chat } from "../models/entities/chat";
import { Message } from "../models/entities/message";
import {
  CreateChatRequest,
  DeleteChatParams,
  GetChatMessagesParams,
  GetChatsQuery,
  SendMessageParams,
  SendMessageRequest,
  UpdateChatParams,
  UpdateChatRequest,
} from "../models/requests/chat";
import {
  ChatServerSentEvent,
  DeleteChatResponse,
  GetChatMessagesResponse,
  GetChatsResponse,
  UpdateChatResponse,
} from "../models/responses/chat";
import { IChatRepository } from "../repositories/chat";
import { IMessageRepository } from "../repositories/message";
import { ApplicationError } from "../utils/errors";
import { getQueryNumber } from "../utils/express";
import { ValidationUtils } from "../utils/validation";
import { IAssistantService } from "./assistant";
import { AuthContext } from "./auth";

export interface IChatService {
  getChats(
    query: GetChatsQuery,
    authContext: AuthContext
  ): Promise<GetChatsResponse>;
  getChatMessages(
    params: GetChatMessagesParams,
    authContext: AuthContext
  ): Promise<GetChatMessagesResponse>;
  createChat(
    request: CreateChatRequest,
    authContext: AuthContext,
    onSendEvent: (event: ChatServerSentEvent) => void
  ): Promise<void>;
  sendMessage(
    params: SendMessageParams,
    request: SendMessageRequest,
    authContext: AuthContext,
    onSendEvent: (event: ChatServerSentEvent) => void
  ): Promise<void>;
  updateChat(
    params: UpdateChatParams,
    request: UpdateChatRequest,
    authContext: AuthContext
  ): Promise<UpdateChatResponse>;
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

  constructor(
    dataContext: IDataContext,
    chatRepository: IChatRepository,
    messageRepository: IMessageRepository,
    assistantService: IAssistantService
  ) {
    this.dataContext = dataContext;
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.assistantService = assistantService;
  }

  async getChats(
    query: GetChatsQuery,
    authContext: AuthContext
  ): Promise<GetChatsResponse> {
    const page = getQueryNumber(query.page, 1);
    const pageSize = getQueryNumber(query.pageSize, 20);

    const chats = await this.chatRepository.findAllPaginated(page, pageSize, {
      userId: authContext.user.id,
    });

    return { chats };
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

    return { messages };
  }

  async createChat(
    request: CreateChatRequest,
    authContext: AuthContext,
    onSendEvent: (event: ChatServerSentEvent) => void
  ): Promise<void> {
    ValidationUtils.validateRequest(
      request,
      z.object({ id: z.string(), message: z.string() })
    );

    const chat: Chat = {
      id: request.id,
      title: "",
      userId: authContext.user.id,
    };

    const userMessage: Message = {
      id: request.id,
      role: "user",
      content: request.message,
      chatId: chat.id,
    };

    const isUserMessageValid = await this.assistantService.validateMessage(
      userMessage
    );

    if (!isUserMessageValid) {
      throw ApplicationError.userMessageViolatesContentPolicy();
    }

    const assistantMessage: Message = {
      id: randomUUID(),
      role: "assistant",
      content: "",
      chatId: chat.id,
    };

    try {
      await this.dataContext.begin();

      await this.chatRepository.create(chat);

      await this.messageRepository.create(userMessage);

      await this.dataContext.commit();
    } catch (error) {
      await this.dataContext.rollback();
      throw error;
    }

    onSendEvent({
      event: "start",
      data: { messageId: assistantMessage.id },
      isDone: false,
    });

    const stream = await this.assistantService.sendMessage([userMessage]);

    for await (const chunk of stream) {
      assistantMessage.content += chunk;

      onSendEvent({
        event: "delta",
        data: { messageId: assistantMessage.id, delta: chunk },
        isDone: false,
      });
    }

    await this.messageRepository.create(assistantMessage);

    onSendEvent({
      event: "end",
      data: { messageId: assistantMessage.id },
      isDone: true,
    });
  }

  async sendMessage(
    params: SendMessageParams,
    request: SendMessageRequest,
    authContext: AuthContext,
    onSendEvent: (event: ChatServerSentEvent) => void
  ): Promise<void> {
    ValidationUtils.validateRequest(
      request,
      z.object({ id: z.string(), content: z.string() })
    );

    const chatExists = await this.chatRepository.exists({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (!chatExists) {
      throw ApplicationError.notFound();
    }

    const userMessage: Message = {
      id: request.id,
      role: "user",
      content: request.content,
      chatId: params.chatId,
    };

    const isUserMessageValid = await this.assistantService.validateMessage(
      userMessage
    );

    if (!isUserMessageValid) {
      throw ApplicationError.userMessageViolatesContentPolicy();
    }

    const assistantMessage: Message = {
      id: randomUUID(),
      role: "assistant",
      content: "",
      chatId: params.chatId,
    };

    const previousMessages = await this.messageRepository.findAll({
      chatId: params.chatId,
    });

    await this.messageRepository.create(userMessage);

    onSendEvent({
      event: "start",
      data: { messageId: assistantMessage.id },
      isDone: false,
    });

    const stream = await this.assistantService.sendMessage([
      ...previousMessages,
      userMessage,
    ]);

    for await (const chunk of stream) {
      assistantMessage.content += chunk;

      onSendEvent({
        event: "delta",
        data: { messageId: assistantMessage.id, delta: chunk },
        isDone: false,
      });
    }

    await this.messageRepository.create(assistantMessage);

    onSendEvent({
      event: "end",
      data: { messageId: assistantMessage.id },
      isDone: true,
    });
  }

  async updateChat(
    params: UpdateChatParams,
    request: UpdateChatRequest,
    authContext: AuthContext
  ): Promise<UpdateChatResponse> {
    ValidationUtils.validateRequest(request, z.object({ title: z.string() }));

    const chatExists = await this.chatRepository.exists({
      id: params.chatId,
      userId: authContext.user.id,
    });

    if (!chatExists) {
      throw ApplicationError.notFound();
    }

    await this.chatRepository.update(params.chatId, { title: request.title });

    return { chatId: params.chatId };
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

    return { chatId: params.chatId };
  }
}
