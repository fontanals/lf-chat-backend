import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import express from "express";
import request from "supertest";
import { Application } from "../../../src/app";
import { User } from "../../../src/models/entities/user";
import {
  SigninRequest,
  SignupRequest,
} from "../../../src/models/requests/auth";
import {
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("Auth Routes", () => {
  const expressApp = express();
  const pool = createTestPool();
  const app = new Application(expressApp, pool);

  const users: User[] = [
    {
      id: randomUUID(),
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -50),
    },
    {
      id: randomUUID(),
      name: "user 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -102),
    },
  ];

  beforeAll(async () => {
    const password = await bcrypt.hash("password", 10);

    await insertUsers(
      users.map((user) => ({ ...user, password })),
      pool
    );
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await app.end();
  });

  describe("signup", () => {
    it("should return a bad request response when request does not match request schema", async () => {
      const response = await request(expressApp)
        .post("/api/signup")
        .send({ name: "user 3" });

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

    it("should return an invalid email or password response when email is duplicate", async () => {
      const signupRequest: SignupRequest = {
        name: "user 3",
        email: users[0].email,
        password: "password",
      };

      const response = await request(expressApp)
        .post("/api/signup")
        .send(signupRequest);

      expect(response.status).toBe(HttpStatusCode.BadRequest);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.InvalidEmailOrPassword,
        }),
      });
    });

    it("should signup a new user creating and returning a new session and the user", async () => {
      const signupRequest: SignupRequest = {
        name: "user 3",
        email: "user3@example.com",
        password: "password",
      };

      const response = await request(expressApp)
        .post("/api/signup")
        .send(signupRequest);

      const accessToken = response.headers["authorization"]?.replace(
        "Bearer ",
        ""
      );

      if (accessToken == null) {
        fail("Expected access token to be returned");
      }

      const refreshToken = response.headers["set-cookie"]?.[0]
        ?.split(";")[0]
        ?.replace("refreshToken=", "");

      if (refreshToken == null) {
        fail("Expected refresh token to be returned");
      }

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: true,
        data: {
          session: { id: expect.any(String), userId: expect.any(String) },
          user: {
            id: expect.any(String),
            name: signupRequest.name,
            email: signupRequest.email,
          },
        },
      });
    });
  });

  describe("signin", () => {
    it("should return a bad request response when request does not match request schema", async () => {
      const user = users[0];

      const response = await request(expressApp)
        .post("/api/signin")
        .send({ email: user.email });

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

    it("should return an invalid email or password response when password is invalid", async () => {
      const user = users[0];

      const signupRequest: SigninRequest = {
        email: user.email,
        password: "invalid password",
      };

      const response = await request(expressApp)
        .post("/api/signin")
        .send(signupRequest);

      expect(response.status).toBe(HttpStatusCode.BadRequest);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.InvalidEmailOrPassword,
        }),
      });
    });

    it("should signin user returning a new session and the user", async () => {
      const user = users[0];

      const signinRequest: SigninRequest = {
        email: user.email,
        password: user.password,
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
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual({
        success: true,
        data: {
          session: { id: expect.any(String), userId: user.id },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt?.toISOString(),
          },
        },
      });
    });
  });
});
