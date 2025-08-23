import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
import { ChatServerSentEvent } from "../../../src/models/responses/chat";
import {
  createChat,
  deleteChat,
  getChatMessages,
  getChats,
  sendMessage,
  updateChat,
} from "../../../src/routes/chat";
import { IServiceProvider } from "../../../src/service-provider";
import { IChatService } from "../../../src/services/chat";
import { Paginated } from "../../../src/utils/types";

describe("Chat Routes", () => {
  let request: jest.Mocked<Request>;
  let response: jest.Mocked<Response>;
  let chatService: jest.Mocked<IChatService>;
  let services: jest.Mocked<IServiceProvider>;

  beforeEach(() => {
    request = {} as unknown as jest.Mocked<Request>;

    response = {
      write: jest.fn(),
    } as unknown as jest.Mocked<Response>;

    chatService = {
      getChats: jest.fn(),
      getChatMessages: jest.fn(),
      createChat: jest.fn(),
      sendMessage: jest.fn(),
      updateChat: jest.fn(),
      deleteChat: jest.fn(),
    };

    services = { get: jest.fn() };
  });

  describe("getChats", () => {
    it("should return chats", async () => {
      services.get.mockReturnValue(chatService);

      const userId = randomUUID();
      const chats: Paginated<Chat> = {
        items: [
          { id: randomUUID(), title: "title", userId },
          { id: randomUUID(), title: "title", userId },
          { id: randomUUID(), title: "title", userId },
          { id: randomUUID(), title: "title", userId },
          { id: randomUUID(), title: "title", userId },
        ],
        totalItems: 5,
        page: 1,
        totalPages: 1,
        pageSize: 10,
      };

      chatService.getChats.mockResolvedValue({ chats });

      const getChatsResponse = await getChats(request, response, services);

      expect(getChatsResponse).toEqual({ chats });
    });
  });

  describe("getChatMessages", () => {
    it("should return chat messages", async () => {
      services.get.mockReturnValue(chatService);

      const chatId = randomUUID();
      const messages: Message[] = [
        { id: randomUUID(), role: "user", content: "message", chatId },
        { id: randomUUID(), role: "assistant", content: "message", chatId },
      ];

      chatService.getChatMessages.mockResolvedValue({ messages });

      const getChatMessagesResponse = await getChatMessages(
        request,
        response,
        services
      );

      expect(getChatMessagesResponse).toEqual({ messages });
    });
  });

  describe("createChat", () => {
    it("should send answer start, delta and end events", async () => {
      services.get.mockReturnValue(chatService);

      const messageId = randomUUID();

      const startEvent: ChatServerSentEvent = {
        event: "start",
        data: { messageId },
        isDone: false,
      };

      const deltaEvent: ChatServerSentEvent = {
        event: "delta",
        data: { messageId, delta: "message" },
        isDone: false,
      };

      const endEvent: ChatServerSentEvent = {
        event: "end",
        data: { messageId },
        isDone: true,
      };

      chatService.createChat.mockImplementation(
        async (request, authContext, onSendEvent) => {
          onSendEvent(startEvent);
          onSendEvent(deltaEvent);
          onSendEvent(endEvent);
        }
      );

      await createChat(request, response, services);

      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(startEvent)}\n\n`
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(deltaEvent)}\n\n`
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(endEvent)}\n\n`
      );
    });
  });

  describe("sendMessage", () => {
    it("should send answer start, delta and end events", async () => {
      services.get.mockReturnValue(chatService);

      const messageId = randomUUID();

      const startEvent: ChatServerSentEvent = {
        event: "start",
        data: { messageId },
        isDone: false,
      };

      const deltaEvent: ChatServerSentEvent = {
        event: "delta",
        data: { messageId, delta: "Hello!" },
        isDone: false,
      };

      const endEvent: ChatServerSentEvent = {
        event: "end",
        data: { messageId },
        isDone: true,
      };

      chatService.sendMessage.mockImplementation(
        async (params, request, authContext, onSendEvent) => {
          onSendEvent(startEvent);
          onSendEvent(deltaEvent);
          onSendEvent(endEvent);
        }
      );

      await sendMessage(request, response, services);

      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(startEvent)}\n\n`
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(deltaEvent)}\n\n`
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(endEvent)}\n\n`
      );
    });
  });

  describe("updateChat", () => {
    it("should return chat id", async () => {
      services.get.mockReturnValue(chatService);

      const chatId = randomUUID();

      chatService.updateChat.mockResolvedValue({ chatId });

      const updateChatResponse = await updateChat(request, response, services);

      expect(updateChatResponse).toEqual({ chatId });
    });
  });

  describe("deleteChat", () => {
    it("should return chat id", async () => {
      services.get.mockReturnValue(chatService);

      const chatId = randomUUID();

      chatService.deleteChat.mockResolvedValue({ chatId });

      const deleteChatResponse = await deleteChat(request, response, services);

      expect(deleteChatResponse).toEqual({ chatId });
    });
  });
});
