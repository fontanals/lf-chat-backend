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
  SigninReponse,
  SignupResponse,
} from "../../../src/models/responses/auth";
import { ApplicationResponse } from "../../../src/models/responses/response";
import {
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("Auth Routes", () => {
  const expressApp = express();
  const pool = createTestPool();
  const app = new Application(expressApp, pool);
  const userRepository = app.services.get("UserRepository");
  const sessionRepository = app.services.get("SessionRepository");
  const refreshTokenRepository = app.services.get("RefreshTokenRepository");

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
        .send({ name: "User 3" });

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

    it("should return an invalid email or password response when email is duplicate", async () => {
      const email = users[0].email;

      const signupRequest: SignupRequest = {
        name: "User 3",
        email,
        password: "password",
      };

      const response = await request(expressApp)
        .post("/api/signup")
        .send(signupRequest);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.InvalidEmailOrPassword,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.BadRequest);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
    });

    it("should signup a new user creating and returning a new session and the user", async () => {
      const signupRequest: SignupRequest = {
        name: "User 3",
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
        fail("Expected access token to be returned.");
      }

      const refreshToken = response.headers["set-cookie"]?.[0]
        ?.split(";")[0]
        ?.replace("refreshToken=", "");

      if (refreshToken == null) {
        fail("Expected refresh token to be returned.");
      }

      const applicationResponse =
        response.body as ApplicationResponse<SignupResponse>;

      if (!applicationResponse.success) {
        fail("Expected success response.");
      }

      const signupResponse = applicationResponse.data;

      const databaseUser = await userRepository.findOne({
        id: signupResponse.user.id,
      });

      if (databaseUser == null) {
        fail("Expected user to be created.");
      }

      const databaseSession = await sessionRepository.findOne({
        id: signupResponse.session.id,
      });

      if (databaseSession == null) {
        fail("Expected session to be created.");
      }

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: refreshToken,
      });

      if (databaseRefreshToken == null) {
        fail("Expected refresh token to be created.");
      }

      const expectedResponseBody = {
        success: true,
        data: {
          session: { id: expect.any(String), userId: expect.any(String) },
          user: {
            id: expect.any(String),
            name: signupRequest.name,
            email: signupRequest.email,
          },
        },
      };

      const expectedUser = expect.objectContaining({
        name: signupRequest.name,
        email: signupRequest.email,
      });

      const expectedSession = expect.objectContaining({
        userId: databaseUser.id,
      });

      const expectedRefreshToken = expect.objectContaining({
        token: refreshToken,
        isRevoked: false,
        sessionId: databaseSession.id,
      });

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
      expect(databaseUser).toEqual(expectedUser);
      expect(databaseSession).toEqual(expectedSession);
      expect(databaseRefreshToken).toEqual(expectedRefreshToken);
      expect(databaseRefreshToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
        addDays(new Date(), 6).getTime()
      );
    });
  });

  describe("signin", () => {
    it("should return a bad request response when request does not match request schema", async () => {
      const user = users[0];

      const response = await request(expressApp)
        .post("/api/signin")
        .send({ email: user.email });

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

    it("should return an invalid email or password response when password is invalid", async () => {
      const user = users[0];

      const signupRequest: SigninRequest = {
        email: user.email,
        password: "invalid password",
      };

      const response = await request(expressApp)
        .post("/api/signin")
        .send(signupRequest);

      const expectedResponseBody = {
        success: false,
        error: expect.objectContaining({
          statusCode: HttpStatusCode.BadRequest,
          code: ApplicationErrorCode.InvalidEmailOrPassword,
        }),
      };

      expect(response.status).toBe(HttpStatusCode.BadRequest);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
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

      const applicationResponse =
        response.body as ApplicationResponse<SigninReponse>;

      if (!applicationResponse.success) {
        fail("Expected success response.");
      }

      const signinResponse = applicationResponse.data;

      const databaseUser = await userRepository.findOne({
        id: signinResponse.user.id,
      });

      if (databaseUser == null) {
        fail("Expected user to be created.");
      }

      const databaseSession = await sessionRepository.findOne({
        id: signinResponse.session.id,
      });

      if (databaseSession == null) {
        fail("Expected session to be created.");
      }

      const databaseRefreshToken = await refreshTokenRepository.findOne({
        token: refreshToken,
      });

      if (databaseRefreshToken == null) {
        fail("Expected refresh token to be created.");
      }

      const expectedResponseBody = {
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
      };

      const expectedUser = expect.objectContaining({
        id: user.id,
        name: user.name,
        email: user.email,
      });

      const expectedSession = expect.objectContaining({
        userId: databaseUser.id,
      });

      const expectedRefreshToken = expect.objectContaining({
        token: refreshToken,
        isRevoked: false,
        sessionId: databaseSession.id,
      });

      expect(response.status).toBe(HttpStatusCode.Ok);
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      );
      expect(response.body).toEqual(expectedResponseBody);
      expect(databaseUser).toEqual(expectedUser);
      expect(databaseSession).toEqual(expectedSession);
      expect(databaseRefreshToken).toEqual(expectedRefreshToken);
      expect(databaseRefreshToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
        addDays(new Date(), 6).getTime()
      );
    });
  });
});
