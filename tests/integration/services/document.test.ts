import { randomUUID } from "crypto";
import { DataContext } from "../../../src/data/data-context";
import { FileStorage } from "../../../src/files/file-storage";
import { Document } from "../../../src/models/entities/document";
import { User } from "../../../src/models/entities/user";
import { UploadDocumentRequest } from "../../../src/models/requests/document";
import { DocumentRepository } from "../../../src/repositories/document";
import { AuthContext } from "../../../src/services/auth";
import { DocumentService } from "../../../src/services/document";
import {
  createTestPool,
  insertDocuments,
  insertUsers,
  truncateDocuments,
  truncateUsers,
} from "../../utils";

describe("DocumentService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const fileStorage = new FileStorage();
  const documentRepository = new DocumentRepository(dataContext);
  const documentService = new DocumentService(
    dataContext,
    fileStorage,
    documentRepository
  );

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

  const authContext: AuthContext = {
    session: {
      id: randomUUID(),
      expiresAt: new Date().toISOString(),
      userId: mockUser.id,
      createdAt: new Date().toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  const mockDocuments: Document[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    key: `test/document-${index + 1}.txt`,
    name: `Document ${index + 1}`,
    mimetype: "text/plain",
    sizeInBytes: 1024,
    isProcessed: false,
    chatId: null,
    projectId: null,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  beforeAll(async () => {
    await fileStorage.writeFile(
      mockDocuments[0].key,
      mockDocuments[0].mimetype,
      Buffer.from("Test File Content")
    );

    await insertUsers([mockUser], pool);
  });

  beforeEach(async () => {
    await insertDocuments(mockDocuments, pool);
  });

  afterEach(async () => {
    await truncateDocuments(pool);
  });

  afterAll(async () => {
    await fileStorage.deleteFile(mockDocuments[0].key);

    await truncateUsers(pool);
    await pool.end();
  });

  describe("uploadDocument", () => {
    it("should upload document and return its id", async () => {
      const mockFile = {
        fieldname: "file",
        originalname: "new-file.txt",
        mimetype: "text/plain",
        size: 1024,
        buffer: Buffer.from("Test file content"),
      } as Express.Multer.File;

      const request: UploadDocumentRequest = { id: randomUUID() };

      const response = await documentService.uploadDocument(
        mockFile,
        request,
        authContext
      );

      const databaseDocuments = await documentRepository.findAll();

      const databaseDocument = databaseDocuments.find(
        (document) => document.id === request.id
      );

      if (databaseDocument == null) {
        fail("Expected document to be created.");
      }

      const file = await fileStorage.readFile(databaseDocument.key);

      await fileStorage.deleteFile(databaseDocument.key);

      expect(file.toString()).toEqual("Test file content");

      expect(databaseDocuments).toEqual(
        expect.arrayContaining([
          ...mockDocuments,
          {
            id: request.id,
            key: expect.any(String),
            name: mockFile.originalname,
            mimetype: mockFile.mimetype,
            sizeInBytes: mockFile.size,
            isProcessed: false,
            chatId: null,
            projectId: null,
            userId: mockUser.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );

      expect(response).toEqual(request.id);
    });
  });

  describe("deleteDocument", () => {
    it("should delete document and return its id", async () => {
      const mockDocument = mockDocuments[0];

      const response = await documentService.deleteDocument(
        { documentId: mockDocument.id },
        authContext
      );

      const databaseDocuments = await documentRepository.findAll();

      expect(fileStorage.readFile(mockDocument.key)).rejects.toThrow();

      expect(databaseDocuments).toEqual(
        expect.arrayContaining(
          mockDocuments.filter((document) => document.id !== mockDocument.id)
        )
      );

      expect(response).toEqual(mockDocument.id);
    });
  });
});
