import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { IFileStorage } from "../../../src/files/file-storage";
import { Document } from "../../../src/models/entities/document";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import { UploadDocumentRequest } from "../../../src/models/requests/document";
import { IDocumentRepository } from "../../../src/repositories/document";
import { AuthContext } from "../../../src/services/auth";
import { DocumentService } from "../../../src/services/document";
import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";

describe("DocumentService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let fileStorage: jest.Mocked<IFileStorage>;
  let documentRepository: jest.Mocked<IDocumentRepository>;
  let documentService: DocumentService;

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Session = {
    id: randomUUID(),
    userId: mockUser.id,
    expiresAt: new Date(),
    createdAt: new Date(),
  };

  const authContext: AuthContext = {
    session: {
      id: mockSession.id,
      expiresAt: mockSession.expiresAt.toISOString(),
      userId: mockSession.userId,
      createdAt: mockSession.createdAt!.toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  const mockDocuments: Document[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    key: randomUUID(),
    name: `Document ${index + 1}`,
    mimetype: "text/plain",
    sizeInBytes: 1024,
    isProcessed: false,
    chatId: null,
    projectId: null,
    userId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    fileStorage = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      deleteFiles: jest.fn(),
    };

    documentRepository = {
      count: jest.fn(),
      exists: jest.fn(),
      findAll: jest.fn(),
      findAny: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    documentService = new DocumentService(
      dataContext,
      fileStorage,
      documentRepository
    );
  });

  describe("uploadDocument", () => {
    it("should save document and return its id", async () => {
      const mockFile = {
        fieldname: "file",
        originalname: "test.pdf",
        mimetype: "application/pdf",
        size: 1024,
      } as Express.Multer.File;

      const request: UploadDocumentRequest = { id: randomUUID() };

      const response = await documentService.uploadDocument(
        mockFile,
        request,
        authContext
      );

      expect(response).toEqual(request.id);
    });
  });

  describe("deleteDocument", () => {
    it("should throw a not found error when document does not exist", async () => {
      documentRepository.findOne.mockResolvedValue(null);

      try {
        await documentService.deleteDocument(
          { documentId: randomUUID() },
          authContext
        );

        fail("Expected to throw not found error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.NotFound
        );
      }
    });

    it("should delete document and return its id", async () => {
      const mockDocument = mockDocuments[0];

      documentRepository.findOne.mockResolvedValue(mockDocument);

      const response = await documentService.deleteDocument(
        { documentId: mockDocument.id },
        authContext
      );

      expect(response).toEqual(mockDocument.id);
    });
  });
});
