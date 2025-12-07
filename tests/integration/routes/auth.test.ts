import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import express from "express";
import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { Application } from "../../../src/app";
import { config } from "../../../src/config";
import { RefreshToken } from "../../../src/models/entities/refresh-token";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import {
  SigninRequest,
  SignupRequest,
} from "../../../src/models/requests/auth";
import {
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";
import {
  createTestPool,
  insertRefreshTokens,
  insertSessions,
  insertUsers,
  truncateUsers,
} from "../../utils";

describe("Auth Routes", () => {
  const expressApp = express();
  const pool = createTestPool();
  const app = new Application(expressApp, pool);

  const mockUsers: User[] = Array.from({ length: 6 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    verificationToken:
      index == 4
        ? jsonwebtoken.sign(
            { email: `user${index + 1}@example.com` },
            config.ACCOUNT_VERIFICATION_TOKEN_SECRET,
            { expiresIn: "15m" }
          )
        : null,
    recoveryToken:
      index === 5
        ? jsonwebtoken.sign(
            { email: `user${index + 1}@example.com` },
            config.PASSWORD_RECOVERY_TOKEN_SECRET,
            { expiresIn: "15m" }
          )
        : null,
    isVerified: index !== 4,
    createdAt: addDays(new Date(), -10 + index),
    updatedAt: addDays(new Date(), -10 + index),
  }));

  const mockSessions: Session[] = mockUsers.map((user) => ({
    id: randomUUID(),
    expiresAt: addDays(user.createdAt!, 7),
    userId: user.id,
    createdAt: user.createdAt,
  }));

  const mockRefreshTokens: RefreshToken[] = mockSessions.map((session) => {
    const user = mockUsers.find((user) => user.id === session.userId)!;

    return {
      id: randomUUID(),
      token: jsonwebtoken.sign(
        {
          session: {
            id: session.id,
            expiresAt: session.expiresAt.toISOString(),
            userId: session.userId,
            createdAt: session.createdAt!.toISOString(),
          },
          user: { id: user.id, name: user.name, email: user.email },
        },
        config.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      ),
      isRevoked: false,
      expiresAt: session.expiresAt,
      sessionId: session.id,
      createdAt: session.createdAt,
      updatedAt: session.createdAt,
    };
  });

  beforeEach(async () => {
    const password = await bcrypt.hash("password", 10);

    await insertUsers(
      mockUsers.map((user) => ({ ...user, password })),
      pool
    );
    await insertSessions(mockSessions, pool);
    await insertRefreshTokens(mockRefreshTokens, pool);
  });

  afterEach(async () => {
    await truncateUsers(pool);
  });

  afterAll(async () => {
    await app.end();
  });

  describe("signup", () => {
    it("should return a resource gone response", async () => {
      const signupRequest: SignupRequest = {
        name: "New User",
        email: "new.user@example.com",
        password: "password",
      };

      const response = await request(expressApp)
        .post("/api/signup")
        .send(signupRequest);

      expect(response.status).toBe(HttpStatusCode.Gone);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Gone,
        }),
      });
    });
  });

  describe("verifyAccount", () => {
    it("should return a resource gone response", async () => {
      const mockUser = mockUsers[4];

      const response = await request(expressApp)
        .post("/api/verify-account")
        .send({ token: mockUser.verificationToken! });

      expect(response.status).toBe(HttpStatusCode.Gone);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Gone,
        }),
      });
    });
  });

  describe("signin", () => {
    it("should return a bad request response when request does not match schema", async () => {
      const mockUser = mockUsers[0];

      const response = await request(expressApp)
        .post("/api/signin")
        .send({ email: mockUser.email });

      expect(response.status).toBe(HttpStatusCode.BadRequest);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.BadRequest,
        }),
      });
    });

    it("should return an invalid email or password response when password is invalid", async () => {
      const mockUser = mockUsers[0];

      const signupRequest: SigninRequest = {
        email: mockUser.email,
        password: "invalid-password",
      };

      const response = await request(expressApp)
        .post("/api/signin")
        .send(signupRequest);

      expect(response.status).toBe(HttpStatusCode.BadRequest);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.InvalidEmailOrPassword,
        }),
      });
    });

    it("should signin user and return a new session and the user", async () => {
      const mockUser = mockUsers[0];

      const signinRequest: SigninRequest = {
        email: mockUser.email,
        password: mockUser.password,
      };

      const response = await request(expressApp)
        .post("/api/signin")
        .send(signinRequest);

      const accessToken = response.headers["authorization"]?.replace(
        "Bearer ",
        ""
      );

      if (accessToken == null) {
        fail("Expected access token to be returned.");
      }

      const refreshToken = response.headers["set-cookie"]?.[0]
        ?.split(";")[0]
        ?.replace("refreshToken=", "");

      if (refreshToken == null) {
        fail("Expected refresh token to be returned.");
      }

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          session: {
            id: expect.any(String),
            expiresAt: expect.any(String),
            userId: mockUser.id,
          },
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            displayName: mockUser.displayName,
            customPrompt: mockUser.customPrompt,
            createdAt: mockUser.createdAt!.toISOString(),
            updatedAt: mockUser.updatedAt!.toISOString(),
          },
        },
      });
    });
  });

  describe("signout", () => {
    it("should signout user and return its id", async () => {
      const mockUser = mockUsers[0];
      const mockSession = mockSessions[0];
      const mockRefreshToken = mockRefreshTokens[0];

      const accessToken = jsonwebtoken.sign(
        {
          session: {
            id: mockSession.id,
            expiresAt: mockSession.expiresAt.toISOString(),
            userId: mockSession.userId,
            createdAt: mockSession.createdAt!.toISOString(),
          },
          user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
        },
        config.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const response = await request(expressApp)
        .post("/api/signout")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Cookie", `refreshToken=${mockRefreshToken.token}`)
        .send();

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockUser.id });
    });
  });

  describe("recoverPassword", () => {
    it("should return a resource gone response", async () => {
      const mockUser = mockUsers[0];

      const response = await request(expressApp)
        .post("/api/recover-password")
        .send({ email: mockUser.email });

      expect(response.status).toBe(HttpStatusCode.Gone);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Gone,
        }),
      });
    });
  });

  describe("resetPassword", () => {
    it("should return a bad request response when request does not match schema", async () => {
      const mockUser = mockUsers[5];

      const response = await request(expressApp)
        .post("/api/reset-password")
        .send({ token: mockUser.recoveryToken!, newPassword: "new-password" });

      expect(response.status).toBe(HttpStatusCode.Gone);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Gone,
        }),
      });
    });
  });
});
