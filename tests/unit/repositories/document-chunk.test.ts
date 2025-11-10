import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Document } from "../../../src/models/entities/document";
import { DocumentChunk } from "../../../src/models/entities/document-chunk";
import { DocumentChunkRepository } from "../../../src/repositories/document-chunk";

describe("DocumentChunkRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let documentChunkRepository: DocumentChunkRepository;

  const mockDocuments: Document[] = Array.from({ length: 5 }, (_, index) => ({
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

  const mockDocumentChunks: DocumentChunk[] = mockDocuments.flatMap(
    (document) =>
      Array.from({ length: 3 }, (_, index) => ({
        id: randomUUID(),
        index,
        content: `Document Chunk ${index + 1}`,
        embedding: [],
        documentId: document.id,
        createdAt: new Date(),
      }))
  );

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    documentChunkRepository = new DocumentChunkRepository(dataContext);
  });

  describe("findAll", () => {
    it("should return an empty array when no document chunks are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const documentChunks = await documentChunkRepository.findAll();

      expect(documentChunks).toEqual([]);
    });

    it("should return document chunks", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockDocumentChunks.map((documentChunk) => ({
          documentChunkId: documentChunk.id,
          documentChunkIndex: documentChunk.index,
          documentChunkContent: documentChunk.content,
          documentChunkDocumentId: documentChunk.documentId,
          documentChunkCreatedAt: documentChunk.createdAt,
        })),
      });

      const documentChunks = await documentChunkRepository.findAll();

      expect(documentChunks).toEqual(mockDocumentChunks);
    });
  });

  describe("findRelevant", () => {
    it("should return an empty array when no document chunks are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const documentChunks = await documentChunkRepository.findRelevant([], 5);

      expect(documentChunks).toEqual([]);
    });

    it("should return document chunks", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockDocumentChunks.map((documentChunk) => ({
          documentChunkId: documentChunk.id,
          documentChunkIndex: documentChunk.index,
          documentChunkContent: documentChunk.content,
          documentChunkDocumentId: documentChunk.documentId,
          documentChunkCreatedAt: documentChunk.createdAt,
        })),
      });

      const documentChunks = await documentChunkRepository.findRelevant([], 5);

      expect(documentChunks).toEqual(
        mockDocumentChunks.map((documentChunk) => ({
          id: documentChunk.id,
          index: documentChunk.index,
          content: documentChunk.content,
          embedding: [],
          documentId: documentChunk.documentId,
          createdAt: documentChunk.createdAt,
        }))
      );
    });

    it("should return document chunks including document", async () => {
      dataContext.query.mockResolvedValue({
        rows: mockDocumentChunks.map((documentChunk) => {
          const document = mockDocuments.find(
            (document) => document.id === documentChunk.documentId
          )!;

          return {
            documentChunkId: documentChunk.id,
            documentChunkIndex: documentChunk.index,
            documentChunkContent: documentChunk.content,
            documentChunkDocumentId: documentChunk.documentId,
            documentChunkCreatedAt: documentChunk.createdAt,
            documentId: document.id,
            documentKey: document.key,
            documentName: document.name,
            documentMimetype: document.mimetype,
            documentSizeInBytes: document.sizeInBytes,
            documentIsProcessed: document.isProcessed,
            documentChatId: document.chatId,
            documentProjectId: document.projectId,
            documentUserId: document.userId,
            documentCreatedAt: document.createdAt,
            documentUpdatedAt: document.updatedAt,
          };
        }),
      });

      const documentChunks = await documentChunkRepository.findRelevant([], 5, {
        includeDocument: true,
      });

      expect(documentChunks).toEqual(
        mockDocumentChunks.map((documentChunk) => ({
          id: documentChunk.id,
          index: documentChunk.index,
          content: documentChunk.content,
          embedding: [],
          documentId: documentChunk.documentId,
          createdAt: documentChunk.createdAt,
          document: mockDocuments.find(
            (document) => document.id === documentChunk.documentId
          ),
        }))
      );
    });
  });
});
