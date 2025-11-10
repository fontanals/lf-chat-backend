import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import express from "express";
import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { Application } from "../../../src/app";
import { config } from "../../../src/config";
import { Chat } from "../../../src/models/entities/chat";
import { Document } from "../../../src/models/entities/document";
import { Message } from "../../../src/models/entities/message";
import { Project } from "../../../src/models/entities/project";
import { User } from "../../../src/models/entities/user";
import {
  CreateChatRequest,
  SendMessageRequest,
  UpdateChatRequest,
  UpdateMessageRequest,
} from "../../../src/models/requests/chat";
import { SendMessageEvent } from "../../../src/models/responses/chat";
import { ArrayUtils } from "../../../src/utils/arrays";
import { ApplicationErrorCode } from "../../../src/utils/errors";
import { HttpStatusCode } from "../../../src/utils/types";
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

describe("Chat Routes", () => {
  const expressApp = express();
  const pool = createTestPool();
  const app = new Application(expressApp, pool);

  const mockUsers: User[] = Array.from({ length: 2 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const accessTokens = mockUsers.map((user) =>
    jsonwebtoken.sign(
      {
        session: {
          id: randomUUID(),
          expiresAt: new Date(),
          userId: user.id,
          createdAt: new Date(),
        },
        user: { id: user.id, name: user.name, email: user.email },
      },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    )
  );

  const project: Project = {
    id: randomUUID(),
    title: "Project 1",
    description: "Project 1 Description",
    userId: mockUsers[0].id,
    createdAt: mockUsers[0].createdAt,
    updatedAt: new Date(),
  };

  let chatNumber = 0;
  const mockChats: Chat[] = mockUsers.flatMap((user, userIndex) =>
    Array.from({ length: 15 }, (_, index) => ({
      id: randomUUID(),
      title: `Chat ${++chatNumber}`,
      projectId: userIndex === 0 && index === 0 ? project.id : null,
      userId: user.id,
      createdAt: addDays(new Date(), -chatNumber),
      updatedAt: addDays(new Date(), -chatNumber),
    }))
  );

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
      userId: mockUsers[0].id,
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
      userId: mockUsers[0].id,
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
    const fileStorage = app.serviceContainer.get("FileStorage");

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

    await insertUsers(mockUsers, pool);
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
    const fileStorage = app.serviceContainer.get("FileStorage");

    await fileStorage.deleteFiles(
      mockDocuments.map((document) => document.key)
    );

    await truncateUsers(pool);
    await app.end();
  });

  describe("getChats", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const response = await request(expressApp).get("/api/chats");

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a success response with the user chats ordered by creation date desc paginated", async () => {
      const mockUser = mockUsers[0];

      const cursor = new Date();
      const limit = 10;

      const response = await request(expressApp)
        .get("/api/chats")
        .query({ cursor: cursor.toString(), limit: limit.toString() })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      const sortedUserChats = mockChats
        .filter((chat) => chat.userId === mockUser.id)
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        );

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          items: sortedUserChats.slice(0, limit).map((chat) => ({
            ...chat,
            createdAt: chat.createdAt!.toISOString(),
            updatedAt: chat.updatedAt!.toISOString(),
          })),
          totalItems: sortedUserChats.length,
          nextCursor: sortedUserChats[limit].createdAt!.toISOString(),
        },
      });
    });
  });

  describe("getChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp).get(
        `/api/chats/${mockChat.id}`
      );

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const response = await request(expressApp)
        .get(`/api/chats/${randomUUID()}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const mockChat = mockChats[20];

      const response = await request(expressApp)
        .get(`/api/chats/${mockChat.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with the chat", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp)
        .get(`/api/chats/${mockChat.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockChat,
          createdAt: mockChat.createdAt!.toISOString(),
          updatedAt: mockChat.updatedAt!.toISOString(),
        },
      });
    });

    it("should return a success response with the chat including project", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp)
        .get(`/api/chats/${mockChat.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockChat,
          createdAt: mockChat.createdAt!.toISOString(),
          updatedAt: mockChat.updatedAt!.toISOString(),
        },
      });
    });
  });

  describe("getChatMessages", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp).get(
        `/api/chats/${mockChat.id}/messages`
      );

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const response = await request(expressApp)
        .get(`/api/chats/${randomUUID()}/messages`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const mockChat = mockChats[20];

      const response = await request(expressApp)
        .get(`/api/chats/${mockChat.id}/messages`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with the chat message tree", async () => {
      const mockChat = mockChats[0];
      const mockChatMessages = mockMessages.filter(
        (message) => message.chatId === mockChat.id
      );

      const response = await request(expressApp)
        .get(`/api/chats/${mockChat.id}/messages`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          latestPath: mockChatMessages.map((message) => message.id),
          rootMessageIds: [mockChatMessages[0].id],
          messages: mockChatMessages.reduce((messagesMap, message) => {
            const messageCopy = {
              ...message,
              childrenMessageIds: [],
              createdAt: message.createdAt!.toISOString(),
              updatedAt: message.updatedAt!.toISOString(),
            };

            messagesMap[messageCopy.id] = messageCopy;

            if (messageCopy.parentMessageId != null) {
              messagesMap[messageCopy.parentMessageId].childrenMessageIds = [
                messageCopy.id,
              ];
            }

            return messagesMap;
          }, {} as any),
        },
      });
    });
  });

  describe("createChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const createChatRequest: CreateChatRequest = {
        id: randomUUID(),
        message: [{ type: "text", id: randomUUID(), text: "User Message" }],
      };

      const response = await request(expressApp)
        .post("/api/chats/")
        .send(createChatRequest);

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a bad request response when request does not match schema", async () => {
      const response = await request(expressApp)
        .post("/api/chats/")
        .send({ id: randomUUID() })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.BadRequest);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.BadRequest,
        }),
      });
    });

    it("should create a new chat and stream assistant response", async () => {
      const createChatRequest: CreateChatRequest = {
        id: randomUUID(),
        message: [{ type: "text", id: randomUUID(), text: "Hello!" }],
      };

      let receivedEvents: string[] = [];
      let messageId = "";

      const response = await request(expressApp)
        .post("/api/chats")
        .send(createChatRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`)
        .set("Accept", "text/event-stream; charset=utf-8")
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            const event = JSON.parse(
              chunk.toString().slice(5, -2)
            ) as SendMessageEvent;

            receivedEvents.push(event.event);

            switch (event.event) {
              case "start": {
                expect(event).toEqual({ event: "start" });

                break;
              }
              case "message-start": {
                messageId = event.data.messageId;

                expect(event).toEqual({
                  event: "message-start",
                  data: {
                    type: "message-start",
                    messageId: expect.any(String),
                  },
                });

                break;
              }
              case "text-start": {
                expect(event).toEqual({
                  event: "text-start",
                  data: {
                    type: "text-start",
                    id: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "text-delta": {
                expect(event).toEqual({
                  event: "text-delta",
                  data: {
                    type: "text-delta",
                    id: expect.any(String),
                    delta: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "text-end": {
                expect(event).toEqual({
                  event: "text-end",
                  data: { type: "text-end", id: expect.any(String), messageId },
                });

                break;
              }
              case "tool-call-start": {
                expect(event).toEqual({
                  event: "tool-call-start",
                  data: {
                    type: "tool-call-start",
                    id: expect.any(String),
                    name: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "tool-call": {
                expect(event).toEqual({
                  event: "tool-call",
                  data: {
                    type: "tool-call",
                    id: expect.any(String),
                    name: expect.any(String),
                    input: expect.any(Object),
                    messageId,
                  },
                });

                break;
              }
              case "tool-call-result": {
                expect(event).toEqual({
                  event: "tool-call-result",
                  data: {
                    type: "tool-call-result",
                    id: expect.any(String),
                    name: expect.any(String),
                    input: expect.any(Object),
                    output: expect.any(Object),
                    messageId,
                  },
                });

                break;
              }
              case "tool-call-end": {
                expect(event).toEqual({
                  event: "tool-call-end",
                  data: {
                    type: "tool-call-end",
                    id: expect.any(String),
                    name: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "message-end": {
                expect(event).toEqual({
                  event: "message-end",
                  data: {
                    type: "message-end",
                    finishReason: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "end": {
                expect(event).toEqual({ event: "end" });

                break;
              }
            }
          });

          res.on("end", () => {
            callback(null, "");
          });
        });

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(receivedEvents).toContain("start");
      expect(receivedEvents).toContain("message-start");
      expect(ArrayUtils.count(receivedEvents, "text-start")).toEqual(
        ArrayUtils.count(receivedEvents, "text-end")
      );
      expect(ArrayUtils.count(receivedEvents, "tool-call-start")).toEqual(
        ArrayUtils.count(receivedEvents, "tool-call")
      );
      expect(ArrayUtils.count(receivedEvents, "tool-call-start")).toEqual(
        ArrayUtils.count(receivedEvents, "tool-call-result")
      );
      expect(ArrayUtils.count(receivedEvents, "tool-call-start")).toEqual(
        ArrayUtils.count(receivedEvents, "tool-call-end")
      );
      expect(receivedEvents).toContain("message-end");
      expect(receivedEvents).toContain("end");
    }, 60000);
  });

  describe("sendMessage", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockChat = mockChats[0];

      const sendMessageRequest: SendMessageRequest = {
        id: randomUUID(),
        content: [{ type: "text", id: randomUUID(), text: "New User Message" }],
      };

      const response = await request(expressApp)
        .post(`/api/chats/${mockChat.id}/messages`)
        .send(sendMessageRequest);

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a bad request response when reques does not match schema", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp)
        .post(`/api/chats/${mockChat.id}/messages`)
        .send({ id: randomUUID(), content: 123 })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.BadRequest);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.BadRequest,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const sendMessageRequest: SendMessageRequest = {
        id: randomUUID(),
        content: [{ type: "text", id: randomUUID(), text: "New User Message" }],
      };

      const response = await request(expressApp)
        .post(`/api/chats/${randomUUID()}/messages`)
        .send(sendMessageRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should send a new message and stream assistant response", async () => {
      const mockChat = mockChats[0];
      const mockChatMessages = mockMessages.filter(
        (message) => message.chatId === mockChat.id
      );

      const sendMessageRequest: SendMessageRequest = {
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

      let receivedEvents: string[] = [];
      let messageId = "";

      const response = await request(expressApp)
        .post(`/api/chats/${mockChat.id}/messages`)
        .send(sendMessageRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`)
        .set("Accept", "text/event-stream; charset=utf-8")
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            const event = JSON.parse(
              chunk.toString().slice(5, -2)
            ) as SendMessageEvent;

            receivedEvents.push(event.event);

            switch (event.event) {
              case "start": {
                expect(event).toEqual({ event: "start" });

                break;
              }
              case "message-start": {
                messageId = event.data.messageId;

                expect(event).toEqual({
                  event: "message-start",
                  data: {
                    type: "message-start",
                    messageId: expect.any(String),
                  },
                });

                break;
              }
              case "text-start": {
                expect(event).toEqual({
                  event: "text-start",
                  data: {
                    type: "text-start",
                    id: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "text-delta": {
                expect(event).toEqual({
                  event: "text-delta",
                  data: {
                    type: "text-delta",
                    id: expect.any(String),
                    delta: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "text-end": {
                expect(event).toEqual({
                  event: "text-end",
                  data: { type: "text-end", id: expect.any(String), messageId },
                });

                break;
              }
              case "tool-call-start": {
                expect(event).toEqual({
                  event: "tool-call-start",
                  data: {
                    type: "tool-call-start",
                    id: expect.any(String),
                    name: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "tool-call": {
                expect(event).toEqual({
                  event: "tool-call",
                  data: {
                    type: "tool-call",
                    id: expect.any(String),
                    name: expect.any(String),
                    input: expect.any(Object),
                    messageId,
                  },
                });

                break;
              }
              case "tool-call-result": {
                expect(event).toEqual({
                  event: "tool-call-result",
                  data: {
                    type: "tool-call-result",
                    id: expect.any(String),
                    name: expect.any(String),
                    input: expect.any(Object),
                    output: expect.any(Object),
                    messageId,
                  },
                });

                break;
              }
              case "tool-call-end": {
                expect(event).toEqual({
                  event: "tool-call-end",
                  data: {
                    type: "tool-call-end",
                    id: expect.any(String),
                    name: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "message-end": {
                expect(event).toEqual({
                  event: "message-end",
                  data: {
                    type: "message-end",
                    finishReason: expect.any(String),
                    messageId,
                  },
                });

                break;
              }
              case "end": {
                expect(event).toEqual({ event: "end" });

                break;
              }
            }
          });

          res.on("end", () => {
            callback(null, "");
          });
        });

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(receivedEvents).toContain("start");
      expect(receivedEvents).toContain("message-start");
      expect(ArrayUtils.count(receivedEvents, "text-start")).toEqual(
        ArrayUtils.count(receivedEvents, "text-end")
      );
      expect(ArrayUtils.count(receivedEvents, "tool-call-start")).toEqual(
        ArrayUtils.count(receivedEvents, "tool-call")
      );
      expect(ArrayUtils.count(receivedEvents, "tool-call-start")).toEqual(
        ArrayUtils.count(receivedEvents, "tool-call-result")
      );
      expect(ArrayUtils.count(receivedEvents, "tool-call-start")).toEqual(
        ArrayUtils.count(receivedEvents, "tool-call-end")
      );
      expect(receivedEvents).toContain("message-end");
      expect(receivedEvents).toContain("end");
    }, 60000);
  });

  describe("updateChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockChat = mockChats[0];

      const updateChatRequest: UpdateChatRequest = {
        title: "Updated Chat Title",
      };

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}`)
        .send(updateChatRequest);

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a bad request response when request does not match request schema", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}`)
        .send({ title: 123 })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.BadRequest);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.BadRequest,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const updateChatRequest: UpdateChatRequest = {
        title: "Updated Chat Title",
      };

      const response = await request(expressApp)
        .patch(`/api/chats/${randomUUID()}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const mockChat = mockChats[20];

      const updateChatRequest: UpdateChatRequest = {
        title: "Updated Chat Title",
      };

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with chat id", async () => {
      const mockChat = mockChats[0];

      const updateChatRequest: UpdateChatRequest = {
        title: "Updated Chat Title",
      };

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockChat.id });
    });
  });

  describe("updateMessage", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockChat = mockChats[0];
      const mockMessage = mockMessages[0];

      const updateMessageRequest: UpdateMessageRequest = { feedback: "like" };

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}/messages/${mockMessage.id}`)
        .send(updateMessageRequest);

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a bad request response when request does not match request schema", async () => {
      const mockChat = mockChats[0];
      const mockMessage = mockMessages[0];

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}/messages/${mockMessage.id}`)
        .send({ feedback: 123 })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.BadRequest);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.BadRequest,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const updateMessageRequest: UpdateMessageRequest = { feedback: "like" };

      const response = await request(expressApp)
        .patch(`/api/chats/${randomUUID()}/messages/${randomUUID()}`)
        .send(updateMessageRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const mockChat = mockChats[mockChats.length - 1];
      const mockMessage = mockMessages[mockMessages.length - 1];

      const updateMessageRequest: UpdateMessageRequest = { feedback: "like" };

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}/messages/${mockMessage.id}`)
        .send(updateMessageRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when message does not exist", async () => {
      const mockChat = mockChats[0];

      const updateMessageRequest: UpdateMessageRequest = { feedback: "like" };

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}/messages/${randomUUID()}`)
        .send(updateMessageRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with message id", async () => {
      const mockChat = mockChats[0];
      const mockMessage = mockMessages[1];

      const updateMessageRequest: UpdateMessageRequest = { feedback: "like" };

      const response = await request(expressApp)
        .patch(`/api/chats/${mockChat.id}/messages/${mockMessage.id}`)
        .send(updateMessageRequest)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockMessage.id });
    });
  });

  describe("deleteChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp).delete(
        `/api/chats/${mockChat.id}`
      );

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const response = await request(expressApp)
        .delete(`/api/chats/${randomUUID()}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const mockChat = mockChats[20];

      const response = await request(expressApp)
        .delete(`/api/chats/${mockChat.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with chat id", async () => {
      const mockChat = mockChats[0];

      const response = await request(expressApp)
        .delete(`/api/chats/${mockChat.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockChat.id });
    });
  });
});
