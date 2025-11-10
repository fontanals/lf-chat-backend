import { randomUUID } from "crypto";
import express from "express";
import jsonwebtoken from "jsonwebtoken";
import request from "supertest";
import { Application } from "../../../src/app";
import { config } from "../../../src/config";
import { Document } from "../../../src/models/entities/document";
import { User } from "../../../src/models/entities/user";
import { UploadDocumentRequest } from "../../../src/models/requests/document";
import { ApplicationErrorCode } from "../../../src/utils/errors";
import { HttpStatusCode } from "../../../src/utils/types";
import {
  createTestPool,
  insertDocuments,
  insertUsers,
  truncateDocuments,
  truncateUsers,
} from "../../utils";

describe("Document Routes", () => {
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

  let documentNumber = 0;
  const mockDocuments: Document[] = mockUsers.flatMap((user) =>
    Array.from({ length: 5 }, () => ({
      id: randomUUID(),
      key: `test/document-${++documentNumber}.txt`,
      name: `Document ${documentNumber}`,
      mimetype: "text/plain",
      sizeInBytes: 1024,
      isProcessed: false,
      chatId: null,
      projectId: null,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  beforeAll(async () => {
    const fileStorage = app.serviceContainer.get("FileStorage");

    await fileStorage.writeFile(
      mockDocuments[0].key,
      mockDocuments[0].mimetype,
      Buffer.from("Test file content")
    );

    await insertUsers(mockUsers, pool);
  });

  beforeEach(async () => {
    await insertDocuments(mockDocuments, pool);
  });

  afterEach(async () => {
    await truncateDocuments(pool);
  });

  afterAll(async () => {
    const fileStorage = app.serviceContainer.get("FileStorage");

    await fileStorage.deleteFile(mockDocuments[0].key);

    await truncateUsers(pool);
    await app.end();
  });

  describe("uploadDocument", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const response = await request(expressApp).post("/api/documents/upload");

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a success response with the document id", async () => {
      const mockUser = mockUsers[0];

      const uploadDocumentRequest: UploadDocumentRequest = {
        id: randomUUID(),
        projectId: null,
      };

      const response = await request(expressApp)
        .post("/api/documents/upload")
        .field("id", uploadDocumentRequest.id)
        .attach("file", Buffer.from("New test file content"), {
          filename: "new-document.txt",
          contentType: "text/plain",
        })
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      const fileStorage = app.serviceContainer.get("FileStorage");

      await fileStorage.deleteFile(
        `${mockUser.id}/${uploadDocumentRequest.id}_new-document.txt`
      );

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({
        success: true,
        data: uploadDocumentRequest.id,
      });
    });
  });

  describe("deleteDocument", () => {
    it("should return an unauthorized response when no access or refresh token is provided", async () => {
      const mockDocument = mockDocuments[0];

      const response = await request(expressApp).delete(
        `/api/documents/${mockDocument.id}`
      );

      expect(response.status).toBe(HttpStatusCode.Unauthorized);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.Unauthorized,
        }),
      });
    });

    it("should return a not found response when document does not exist", async () => {
      const response = await request(expressApp)
        .delete(`/api/documents/${randomUUID()}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a not found response when document is from another user", async () => {
      const mockDocument = mockDocuments[6];

      const response = await request(expressApp)
        .delete(`/api/documents/${mockDocument.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.NotFound);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ApplicationErrorCode.NotFound,
        }),
      });
    });

    it("should return a success response with the document id", async () => {
      const mockDocument = mockDocuments[0];

      const response = await request(expressApp)
        .delete(`/api/documents/${mockDocument.id}`)
        .set("Authorization", `Bearer ${accessTokens[0]}`);

      expect(response.status).toBe(HttpStatusCode.Ok);

      expect(response.body).toEqual({ success: true, data: mockDocument.id });
    });
  });
});
