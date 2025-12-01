import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import express from "express";
import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { Application } from "../../../src/app";
import { config } from "../../../src/config";
import { User } from "../../../src/models/entities/user";
import { UpdateUserRequest } from "../../../src/models/requests/user";
import {
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("User Routes", () => {
  const expressApp = express();
  const pool = createTestPool();
  const app = new Application(expressApp, pool);

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const accessToken = jsonwebtoken.sign(
    {
      session: {
        id: randomUUID(),
        expiresAt: new Date(),
        userId: mockUser.id,
        createdAt: new Date(),
      },
      user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
    },
    config.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash(mockUser.password, 10);

    await insertUsers([{ ...mockUser, password: hashedPassword }], pool);
  });

  afterEach(async () => {
    await truncateUsers(pool);
  });

  afterAll(async () => {
    await app.end();
  });

  describe("getUser", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const response = await request(expressApp).get("/api/user");

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a success response with the user", async () => {
      const response = await request(expressApp)
        .get("/api/user")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          displayName: mockUser.displayName,
          customPrompt: mockUser.customPrompt,
          createdAt: mockUser.createdAt!.toISOString(),
          updatedAt: mockUser.updatedAt!.toISOString(),
        },
      });
    });
  });

  describe("updateUser", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const updateUserRequest: UpdateUserRequest = {
        displayName: "Updated Display Name",
        customPrompt: "Updated Custom Prompt",
      };

      const response = await request(expressApp)
        .patch("/api/user")
        .send(updateUserRequest);

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a success response with the user id", async () => {
      const updateUserRequest: UpdateUserRequest = {
        displayName: "Updated Display Name",
        customPrompt: "Updated Custom Prompt",
      };

      const response = await request(expressApp)
        .patch("/api/user")
        .send(updateUserRequest)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockUser.id });
    });
  });

  describe("deleteUser", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const response = await request(expressApp).delete("/api/user");

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a success response with the user id", async () => {
      const response = await request(expressApp)
        .delete("/api/user")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockUser.id });
    });
  });
});
