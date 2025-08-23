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
import { Session } from "../../../src/models/entities/session";
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

  const users: User[] = [
    {
      id: randomUUID(),
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -12),
    },
    {
      id: randomUUID(),
      name: "user 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -15),
    },
  ];
  const sessions: Session[] = [
    {
      id: randomUUID(),
      userId: users[0].id,
      createdAt: addDays(new Date(), -12),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      createdAt: addDays(new Date(), -15),
    },
  ];
  const accessTokens = users.map((user, index) =>
    jsonwebtoken.sign(
      { session: sessions[index], user: mapUserToDto(user) },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    )
  );
  const chats: Chat[] = [
    {
      id: randomUUID(),
      userId: users[0].id,
      title: "user 1 chat 1",
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      userId: users[0].id,
      title: "user 1 chat 2",
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      title: "user 2 chat 1",
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      title: "user 2 chat 2",
      createdAt: addDays(new Date(), -10),
    },
  ];
  const messages: Message[] = [
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[0].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[1].id,
      createdAt: addDays(new Date(), -4),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
      chatId: chats[2].id,
      createdAt: addDays(new Date(), -8),
    },
    {
      id: randomUUID(),
      role: "user",
      content: "message",
      chatId: chats[3].id,
      createdAt: addDays(new Date(), -10),
    },
    {
      id: randomUUID(),
      role: "assistant",
      content: "message",
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

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
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

      const sortedUserChats = chats
        .filter((chat) => chat.userId === userId)
        .sort(
          (chatA, chatB) =>
            (chatB.createdAt?.getTime() ?? 0) -
            (chatA.createdAt?.getTime() ?? 0)
        );

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: true,
        data: {
          chats: {
            items: sortedUserChats
              .slice((page - 1) * pageSize, page * pageSize)
              .map((chat) =>
                expect.objectContaining({
                  ...chat,
                  createdAt: chat.createdAt?.toISOString(),
                })
              ),
            totalItems: sortedUserChats.length,
            page,
            pageSize,
            totalPages: Math.ceil(sortedUserChats.length / pageSize),
          },
        },
      });
    });
  });

  describe("getChatMessages", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const chatId = chats[0].id;

      const response = await request(expressApp).get(
        `/api/chats/${chatId}/messages`
      );

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[2].id;

      const response = await request(expressApp)
        .get(`/api/chats/${chatId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with the chat messages ordered by creation date", async () => {
      const accessToken = accessTokens[1];
      const chatId = chats[2].id;

      const response = await request(expressApp)
        .get(`/api/chats/${chatId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
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
      });
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

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
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

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(errorEvent).toEqual({
        event: "error",
        data: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.BadRequest,
        }),
        isDone: true,
      });
    });

    it("should create a new chat returning assistant message events", async () => {
      const accessToken = accessTokens[0];

      const createChatRequest: CreateChatRequest = {
        id: randomUUID(),
        message: "message",
      };

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

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
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

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
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

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(errorEvent).toEqual({
        event: "error",
        data: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.BadRequest,
        }),
        isDone: true,
      });
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

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      expect(errorEvent).toEqual({
        event: "error",
        data: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
        isDone: true,
      });
    });

    it("should send a message to the chat returning assistant message", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const sendMessageRequest: SendMessageRequest = {
        id: randomUUID(),
        content: "message",
      };

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
                expect(event).toEqual({
                  event: "start",
                  data: { messageId: expect.any(String) },
                  isDone: false,
                });
              } else if (event.event === "delta") {
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

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "text/event-stream; charset=utf-8"
      );
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
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

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a bad request response when request does not match request schema", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send({ title: 123 })
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.BadRequest);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.BadRequest,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const accessToken = accessTokens[0];
      const chatId = randomUUID();

      const updateChatRequest: UpdateChatRequest = { title: "updated title" };

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[2].id;

      const updateChatRequest: UpdateChatRequest = { title: "updated title" };

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should update chat title returning the chat id", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const updateChatRequest: UpdateChatRequest = { title: "updated title" };

      const response = await request(expressApp)
        .patch(`/api/chats/${chatId}`)
        .send(updateChatRequest)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({ success: true, data: { chatId } });
    });
  });

  describe("deleteChat", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const chatId = chats[0].id;

      const response = await request(expressApp).delete(`/api/chats/${chatId}`);

      expect(response.status).toBe(HttpStatusCode.Unauthorized);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.Unauthorized,
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when chat does not exist", async () => {
      const accessToken = accessTokens[0];
      const chatId = randomUUID();

      const response = await request(expressApp)
        .delete(`/api/chats/${chatId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when chat is from another user", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[2].id;

      const response = await request(expressApp)
        .delete(`/api/chats/${chatId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.NotFound,
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should delete chat returning its id", async () => {
      const accessToken = accessTokens[0];
      const chatId = chats[0].id;

      const response = await request(expressApp)
        .delete(`/api/chats/${chatId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({ success: true, data: { chatId } });
    });
  });
});
