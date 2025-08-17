import { Request, Response } from "express";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
import { ChatServerSentEvent } from "../../../src/models/responses/chat";
import {
  createChat,
  deleteChat,
  getChatMessages,
  getChats,
  renameChat,
  sendMessage,
} from "../../../src/routes/chat";
import { IServiceProvider } from "../../../src/service-provider";
import { IChatService } from "../../../src/services/chat";

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
      renameChat: jest.fn(),
      deleteChat: jest.fn(),
    };

    services = { get: jest.fn() };
  });

  describe("getChats", () => {
    it("should return chats", async () => {
      services.get.mockReturnValue(chatService);

      const chats: Chat[] = [
        { id: "chat-1", title: "Chat 1", userId: "user-id" },
        { id: "chat-2", title: "Chat 2", userId: "user-id" },
        { id: "chat-3", title: "Chat 3", userId: "user-id" },
        { id: "chat-4", title: "Chat 4", userId: "user-id" },
        { id: "chat-5", title: "Chat 5", userId: "user-id" },
      ];

      chatService.getChats.mockResolvedValue({ chats });

      const result = await getChats(request, response, services);

      expect(result.chats).toEqual(chats);
    });
  });

  describe("getChatMessages", () => {
    it("should return chat messages", async () => {
      services.get.mockReturnValue(chatService);

      const messages: Message[] = [
        { id: "message-1", role: "user", content: "Hello!", chatId: "chat-id" },
        {
          id: "message-2",
          role: "assistant",
          content: "Hi there! How can I help you today?",
          chatId: "chat-id",
        },
      ];

      chatService.getChatMessages.mockResolvedValue({ messages });

      const result = await getChatMessages(request, response, services);

      expect(result.messages).toEqual(messages);
    });
  });

  describe("createChat", () => {
    it("should create chat and send answer server sent events", async () => {
      services.get.mockReturnValue(chatService);

      const startEvent: ChatServerSentEvent = {
        event: "start",
        data: { messageId: "message-1" },
        isDone: false,
      };

      const deltaEvent: ChatServerSentEvent = {
        event: "delta",
        data: { messageId: "message-1", delta: "Hello!" },
        isDone: false,
      };

      const endEvent: ChatServerSentEvent = {
        event: "end",
        data: { messageId: "message-1" },
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
    it("should create message and send answer server sent events", async () => {
      services.get.mockReturnValue(chatService);

      const startEvent: ChatServerSentEvent = {
        event: "start",
        data: { messageId: "message-1" },
        isDone: false,
      };

      const deltaEvent: ChatServerSentEvent = {
        event: "delta",
        data: { messageId: "message-1", delta: "Hello!" },
        isDone: false,
      };

      const endEvent: ChatServerSentEvent = {
        event: "end",
        data: { messageId: "message-1" },
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

  describe("renameChat", () => {
    it("should rename chat and return its id", async () => {
      services.get.mockReturnValue(chatService);

      chatService.renameChat.mockResolvedValue({ chatId: "chat-id" });

      const result = await renameChat(request, response, services);

      expect(result.chatId).toEqual("chat-id");
    });
  });

  describe("deleteChat", () => {
    it("should delete chat and return its id", async () => {
      services.get.mockReturnValue(chatService);

      chatService.deleteChat.mockResolvedValue({ chatId: "chat-id" });

      const result = await deleteChat(request, response, services);

      expect(result.chatId).toEqual("chat-id");
    });
  });
});
