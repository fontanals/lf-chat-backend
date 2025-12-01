import { randomUUID } from "crypto";
import { DataContext } from "../../../src/data/data-context";
import { Document } from "../../../src/models/entities/document";
import { DocumentChunk } from "../../../src/models/entities/document-chunk";
import { User } from "../../../src/models/entities/user";
import { DocumentChunkRepository } from "../../../src/repositories/document-chunk";
import {
  createTestPool,
  insertDocumentChunks,
  insertDocuments,
  insertUsers,
  truncateDocumentChunks,
  truncateUsers,
} from "../../utils";

describe("DocumentChunkRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const documentChunkRepository = new DocumentChunkRepository(dataContext);

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

  const mockDocuments: Document[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    key: randomUUID(),
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

  let documentChunkNumber = 0;
  const mockDocumentChunks: DocumentChunk[] = mockDocuments.flatMap(
    (document) =>
      Array.from({ length: 3 }, (_, index) => ({
        id: randomUUID(),
        index,
        content: `Document Chunk ${++documentChunkNumber}`,
        embedding: Array.from({ length: 1536 }, () => 0.0),
        documentId: document.id,
        createdAt: new Date(),
      }))
  );

  beforeAll(async () => {
    await insertUsers([mockUser], pool);
    await insertDocuments(mockDocuments, pool);
  });

  beforeEach(async () => {
    await insertDocumentChunks(mockDocumentChunks, pool);
  });

  afterEach(async () => {
    await truncateDocumentChunks(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("findAll", () => {
    it("should return all document chunks", async () => {
      const databaseDocumentChunks = await documentChunkRepository.findAll();

      expect(databaseDocumentChunks).toEqual(
        mockDocumentChunks.map((documentChunk) => ({
          id: documentChunk.id,
          index: documentChunk.index,
          content: documentChunk.content,
          embedding: [],
          documentId: documentChunk.documentId,
          createdAt: expect.any(Date),
        }))
      );
    });
  });

  describe("findRelevant", () => {
    it("should return document chunks", async () => {
      const mockDocument = mockDocuments[0];

      const databaseDocumentChunks = await documentChunkRepository.findRelevant(
        Array.from({ length: 1536 }, () => 0.0),
        2,
        { documentId: mockDocument.id }
      );

      expect(databaseDocumentChunks).toEqual(
        expect.arrayContaining(
          mockDocumentChunks
            .filter(
              (documentChunk) => documentChunk.documentId === mockDocument.id
            )
            .slice(0, 2)
            .map((documentChunk) => ({
              id: documentChunk.id,
              index: documentChunk.index,
              content: documentChunk.content,
              embedding: [],
              documentId: documentChunk.documentId,
              createdAt: expect.any(Date),
            }))
        )
      );
    });

    it("should return document chunks including document", async () => {
      const mockDocument = mockDocuments[0];

      const databaseDocumentChunks = await documentChunkRepository.findRelevant(
        Array.from({ length: 1536 }, () => 0.0),
        5,
        { documentId: mockDocument.id, includeDocument: true }
      );

      expect(databaseDocumentChunks).toEqual(
        expect.arrayContaining(
          mockDocumentChunks
            .filter(
              (documentChunk) => documentChunk.documentId === mockDocument.id
            )
            .map((documentChunk) => ({
              id: documentChunk.id,
              index: documentChunk.index,
              content: documentChunk.content,
              embedding: [],
              documentId: documentChunk.documentId,
              createdAt: expect.any(Date),
              document: mockDocument,
            }))
        )
      );
    });
  });

  describe("createAll", () => {
    it("should create new document chunks", async () => {
      const mockDocument = mockDocuments[0];

      const newDocumentChunks: DocumentChunk[] = Array.from(
        { length: 2 },
        (_, index) => ({
          id: randomUUID(),
          index,
          content: `New Document Chunk ${index + 1}`,
          embedding: Array.from({ length: 1536 }, () => 0.0),
          documentId: mockDocument.id,
          createdAt: new Date(),
        })
      );

      await documentChunkRepository.createAll(newDocumentChunks);

      const databaseDocumentChunks = await documentChunkRepository.findAll();

      expect(databaseDocumentChunks).toEqual(
        expect.arrayContaining([
          ...mockDocumentChunks.map((documentChunk) => ({
            id: documentChunk.id,
            index: documentChunk.index,
            content: documentChunk.content,
            embedding: [],
            documentId: documentChunk.documentId,
            createdAt: expect.any(Date),
          })),
          ...newDocumentChunks.map((documentChunk) => ({
            id: documentChunk.id,
            index: documentChunk.index,
            content: documentChunk.content,
            embedding: [],
            documentId: documentChunk.documentId,
            createdAt: expect.any(Date),
          })),
        ])
      );
    });
  });
});
