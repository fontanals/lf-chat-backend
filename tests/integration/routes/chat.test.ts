import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import express from "express";
import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { Application } from "../../../src/app";
import { config } from "../../../src/config";
import { Chat } from "../../../src/models/entities/chat";
import { Message } from "../../../src/models/entities/message";
import { mapUserToDto, User } from "../../../src/models/entities/user";
import {
  CreateChatRequest,
  GetChatsQuery,
  SendMessageRequest,
  UpdateChatRequest,
} from "../../../src/models/requests/chat";
import { ChatServerSentEvent } from "../../../src/models/responses/chat";
import {
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";
import {
  ErrorServerSentEvent,
  ServerSentEvent,
} from "../../../src/utils/types";
import {
  createTestPool,
  insertChats,
  insertMessages,
  insertUsers,
  truncateChats,
  truncateUsers,
} from "../../utils";

describe("Chat Routes", () => {
  const expressApp = express();
  const pool = createTestPool();
  const app = new Application(expressApp, pool);
  const chatRepository = app.services.get("ChatRepository");
  const messageRepository = app.services.get("MessageRepository");

  const users: User[] = [
    {
      id: randomUUID(),
      name: "User 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -50),
    },
    {
      id: randomUUID(),
      name: "User 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -102),
    },
  ];
  const accessTokens = users.map((user) =>
    jsonwebtoken.sign(
      {
        session: { id: randomUUID(), userId: user.id },
        user: mapUserToDto(user),
      },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    )
  );
  const chats: Chat[] = [
    {
      id: randomUUID(),
      userId: users[0].id,
      title: "User 1 Chat 1",
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      userId: users[0].id,
      title: "User 1 Chat 2",
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      title: "User 2 Chat 1",
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      title: "User 2 Chat 2",
      createdAt: addDays(new Date(), -10),
    },
  ];
  const messages: Message[] = [
    {
      id: randomUUID(),
      role: "user",
      content: "User 1 Chat 1 Message 1",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "User 1 Chat 1 Message 2",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "User 1 Chat 2 Message 1",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "User 1 Chat 2 Message 2",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "User 2 Chat 1 Message 1",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "User 2 Chat 1 Message 2",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "User 2 Chat 2 Message 1",
      chatId: chats[3].id,
      createdAt: addDays(new Date(), -10),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "User 2 Chat 2 Message 2",
      chatId: chats[3].id,
      createdAt: addDays(new Date(), -10),
    },
  ];

  beforeAll(async () => {
    const password = await bcrypt.hash("password", 10);

    await insertUsers(
      users.map((user) => ({ ...user, password })),
      pool
    );
  });

  beforeEach(async () => {
    await insertChats(chats, pool);
    await insertMessages(messages, pool);
  });

  afterEach(async () => {
    await truncateChats(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await app.end();
  });

  describe("getChats", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const response = await request(expressApp).get("/api/chats");

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a success response with the user chats ordered by creation date desc paginated", async () => {
      const userId = users[0].id;
      const accessToken = accessTokens[0];
      const page = 1;
      const pageSize = 50;

      const getChatsQuery: GetChatsQuery = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };

      const response = await request(expressApp)
        .get("/api/chats")
        .query(getChatsQuery)
        .set("Authorization", `Bearer ${accessToken}`);

      const userChats = chats
        .filter((chat) => chat.userId === userId)
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        );

      const expectedResponseBody = {
        success: true,
        data: {
          chats: {
            items: userChats
              .slice((page - 1) * pageSize, page * pageSize)
              .map((chat) =>
                expect.objectContaining({
                  ...chat,
                  createdAt: chat.createdAt?.toISOString(),
                })
              ),
            totalItems: userChats.length,
            page,
            pageSize,
            totalPages: Math.ceil(userChats.length / pageSize),
          },
        },
      };

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });
  });

  describe("getChatMessages", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const chatId = chats[0].id;

      const response = await request(expressApp).get(
        `/api/chats/${chatId}/messages`
      );

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a not found response when chat is from another user", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[2].id;

      const response = await request(expressApp)
        .get(`/api/chats/${chatId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a success response with the chat messages ordered by creation date", async () => {
      const accessToken = accessTokens[1];
      const chatId = chats[2].id;

      const response = await request(expressApp)
        .get(`/api/chats/${chatId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`);

      const expectedResponseBody = {
        success: true,
        data: {
          messages: messages
            .filter((message) => message.chatId === chatId)
            .sort(
              (messageA, messageB) =>
                (messageA.createdAt?.getTime() ?? 0) -
                (messageB.createdAt?.getTime() ?? 0)
            )
            .map((message) =>
              expect.objectContaining({
                ...message,
                createdAt: message.createdAt?.toISOString(),
              })
            ),
        },
      };

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });
  });

  describe("createChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const createChatRequest: CreateChatRequest = {
        id: randomUUID(),
        message: "message",
      };

      const response = await request(expressApp)
        .post("/api/chats/")
        .send(createChatRequest);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a bad request event when request does not match request schema", async () => {
      const accessToken = accessTokens[0];

      let errorEvent: ErrorServerSentEvent | null = null;

      const response = await request(expressApp)
        .post("/api/chats/")
        .send({ message: "message" })
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Accept", "text/event-stream; charset=utf-8")
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            const serializedEvent = chunk.toString().split("data: ")[1];

            if (serializedEvent != null) {
              const event = JSON.parse(serializedEvent) as ServerSentEvent;

              if (event.event === "error") {
                errorEvent = event as ErrorServerSentEvent;
              }
            }
          });

          res.on("end", () => {
            callback(null, "");
          });
        });

      const expectedErrorEvent = {
        event: "error",
        data: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.BadRequest,
        }),
        isDone: true,
      };

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(errorEvent).toEqual(expectedErrorEvent);
    });

    it("should create a new chat returning assistant message events", async () => {
      const userId = users[0].id;
      const accessToken = accessTokens[0];

      const createChatRequest: CreateChatRequest = {
        id: randomUUID(),
        message: "message",
      };

      let responseMessageContent = "";

      const response = await request(expressApp)
        .post("/api/chats")
        .send(createChatRequest)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Accept", "text/event-stream; charset=utf-8")
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            const serializedEvent = chunk.toString().split("data: ")[1];

            if (serializedEvent != null) {
              const event = JSON.parse(serializedEvent) as ChatServerSentEvent;

              if (event.event === "start") {
                expect(event).toEqual({
                  event: "start",
                  data: { messageId: expect.any(String) },
                  isDone: false,
                });
              } else if (event.event === "delta") {
                responseMessageContent += event.data.delta;
                expect(event).toEqual({
                  event: "delta",
                  data: {
                    messageId: expect.any(String),
                    delta: expect.any(String),
                  },
                  isDone: false,
                });
              } else if (event.event === "end") {
                expect(event).toEqual({
                  event: "end",
                  data: { messageId: expect.any(String) },
                  isDone: true,
                });
              }
            }
          });

          res.on("end", () => {
            callback(null, "");
          });
        });

      const databaseChat = await chatRepository.findOne({
        id: createChatRequest.id,
      });

      if (databaseChat == null) {
        fail("Expected chat to be created.");
      }

      const databaseMessages = await messageRepository.findAll({
        chatId: databaseChat.id,
      });

      const expectedChat = expect.objectContaining({
        id: createChatRequest.id,
        userId,
      });

      const expectedMessages = expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: createChatRequest.message,
          chatId: createChatRequest.id,
        }),
        expect.objectContaining({
          role: "assistant",
          content: responseMessageContent,
          chatId: createChatRequest.id,
        }),
      ]);

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(databaseChat).toEqual(expectedChat);
      expect(databaseMessages).toEqual(expectedMessages);
    });
  });

  describe("sendMessage", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const chatId = chats[0].id;

      const sendMessageRequest: SendMessageRequest = {
        id: randomUUID(),
        content: "message",
      };

      const response = await request(expressApp)
        .post(`/api/chats/${chatId}/messages`)
        .send(sendMessageRequest);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a bad request event when request does not match request schema", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      let errorEvent: ErrorServerSentEvent | null = null;

      const response = await request(expressApp)
        .post(`/api/chats/${chatId}/messages`)
        .send({ message: "message" })
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Accept", "text/event-stream; charset=utf-8")
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            const serializedEvent = chunk.toString().split("data: ")[1];

            if (serializedEvent != null) {
              const event = JSON.parse(serializedEvent) as ServerSentEvent;

              if (event.event === "error") {
                errorEvent = event as ErrorServerSentEvent;
              }
            }
          });

          res.on("end", () => {
            callback(null, "");
          });
        });

      const expectedErrorEvent = {
        event: "error",
        data: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.BadRequest,
        }),
        isDone: true,
      };

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(errorEvent).toEqual(expectedErrorEvent);
    });

    it("should return a not found event when chat does not exist", async () => {
      const accessToken = accessTokens[0];
      const chatId = randomUUID();

      const sendMessageRequest: SendMessageRequest = {
        id: randomUUID(),
        content: "message",
      };

      let errorEvent: ErrorServerSentEvent | null = null;

      const response = await request(expressApp)
        .post(`/api/chats/${chatId}/messages`)
        .send(sendMessageRequest)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Accept", "text/event-stream; charset=utf-8")
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            const serializedEvent = chunk.toString().split("data: ")[1];

            if (serializedEvent != null) {
              const event = JSON.parse(serializedEvent) as ServerSentEvent;

              if (event.event === "error") {
                errorEvent = event as ErrorServerSentEvent;
              }
            }
          });

          res.on("end", () => {
            callback(null, "");
          });
        });

      const expectedErrorEvent = {
        event: "error",
        data: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
        isDone: true,
      };

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(errorEvent).toEqual(expectedErrorEvent);
    });

    it("should send a message to the chat returning assistant message", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const sendMessageRequest: SendMessageRequest = {
        id: randomUUID(),
        content: "message",
      };

      let responseMessageId = "";
      let responseMessageContent = "";

      const response = await request(expressApp)
        .post(`/api/chats/${chatId}/messages`)
        .send(sendMessageRequest)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Accept", "text/event-stream; charset=utf-8")
        .buffer(true)
        .parse((res, callback) => {
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            const serializedEvent = chunk.toString().split("data: ")[1];

            if (serializedEvent != null) {
              const event = JSON.parse(serializedEvent) as ChatServerSentEvent;

              if (event.event === "start") {
                responseMessageId = event.data.messageId;
                expect(event).toEqual({
                  event: "start",
                  data: { messageId: expect.any(String) },
                  isDone: false,
                });
              } else if (event.event === "delta") {
                responseMessageContent += event.data.delta;
                expect(event).toEqual({
                  event: "delta",
                  data: {
                    messageId: expect.any(String),
                    delta: expect.any(String),
                  },
                  isDone: false,
                });
              } else if (event.event === "end") {
                expect(event).toEqual({
                  event: "end",
                  data: { messageId: expect.any(String) },
                  isDone: true,
                });
              }
            }
          });

          res.on("end", () => {
            callback(null, "");
          });
        });

      const databaseMessages = await messageRepository.findAll({ chatId });

      const expectedMessages = expect.arrayContaining([
        expect.objectContaining({
          id: sendMessageRequest.id,
          role: "user",
          content: sendMessageRequest.content,
          chatId,
        }),
        expect.objectContaining({
          id: responseMessageId,
          role: "assistant",
          content: responseMessageContent,
          chatId,
        }),
      ]);

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(databaseMessages).toEqual(expectedMessages);
    });
  });

  describe("updateChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const chatId = chats[0].id;

      const updateChatRequest: UpdateChatRequest = {
        title: "updated title",
      };

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send(updateChatRequest);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a bad request response when request does not match request schema", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send({ title: 123 })
        .set("Authorization", `Bearer ${accessToken}`);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.BadRequest,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.BadRequest);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a not found response when chat does not exist", async () => {
      const accessToken = accessTokens[0];
      const chatId = randomUUID();

      const updateChatRequest: UpdateChatRequest = { title: "updated title" };

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessToken}`);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a not found response when chat is from another user", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[2].id;

      const updateChatRequest: UpdateChatRequest = { title: "updated title" };

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessToken}`);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should update chat title returning the chat id", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const updateChatRequest: UpdateChatRequest = { title: "updated title" };

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessToken}`);

      const databaseChats = await chatRepository.findAll();

      const expectedResponseBody = { success: true, data: { chatId } };

      const expectedChats = expect.arrayContaining(
        chats.map((chat) =>
          chat.id === chatId
            ? expect.objectContaining({
                ...chat,
                title: updateChatRequest.title,
              })
            : expect.objectContaining(chat)
        )
      );

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
      expect(databaseChats).toEqual(expectedChats);
    });
  });

  describe("deleteChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const chatId = chats[0].id;

      const response = await request(expressApp).delete(`/api/chats/${chatId}`);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a not found response when chat does not exist", async () => {
      const accessToken = accessTokens[0];
      const chatId = randomUUID();

      const response = await request(expressApp)
        .delete(`/api/chats/${chatId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should return a not found response when chat is from another user", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[2].id;

      const response = await request(expressApp)
        .delete(`/api/chats/${chatId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should delete chat returning its id", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const response = await request(expressApp)
        .delete(`/api/chats/${chatId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      const databaseChats = await chatRepository.findAll();

      const expectedResponseBody = { success: true, data: { chatId } };

      const expectedChats = expect.arrayContaining(
        chats
          .filter((chat) => chat.id !== chatId)
          .map((chat) => expect.objectContaining(chat))
      );

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
      expect(databaseChats).toEqual(expectedChats);
    });
  });
});
