import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Document } from "../../../src/models/entities/document";
import { DocumentRepository } from "../../../src/repositories/document";

describe("DocumentRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let documentRepository: DocumentRepository;

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

    documentRepository = new DocumentRepository(dataContext);
  });

  describe("count", () => {
    it("should return 0 when no documents are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [{ count: "0" }] });

      const count = await documentRepository.count();

      expect(count).toBe(0);
    });

    it("should return the correct document count", async () => {
      dataContext.query.mockResolvedValue({ rows: [{ count: "5" }] });

      const count = await documentRepository.count();

      expect(count).toBe(5);
    });
  });

  describe("exists", () => {
    it("should return false when no document is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const exists = await documentRepository.exists();

      expect(exists).toBe(false);
    });

    it("should return true when a document is found", async () => {
      const mockDocument = mockDocuments[0];

      dataContext.query.mockResolvedValue({ rows: [mockDocument] });

      const exists = await documentRepository.exists();

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return an empty array when no documents are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const documents = await documentRepository.findAll();

      expect(documents).toEqual([]);
    });

    it("should return documents", async () => {
      dataContext.query.mockResolvedValue({ rows: mockDocuments });

      const documents = await documentRepository.findAll();

      expect(documents).toEqual(mockDocuments);
    });
  });

  describe("findOne", () => {
    it("should return null when no document is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const document = await documentRepository.findOne();

      expect(document).toBeNull();
    });

    it("should return document", async () => {
      const mockDocument = mockDocuments[0];

      dataContext.query.mockResolvedValue({ rows: [mockDocument] });

      const document = await documentRepository.findOne();

      expect(document).toEqual(mockDocument);
    });
  });

  describe("getChatContextDocuments", () => {
    it("should return an empty array when no documents are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const documents = await documentRepository.getChatContextDocuments(
        { ids: [], chatId: randomUUID() },
        randomUUID()
      );

      expect(documents).toEqual([]);
    });

    it("should return documents", async () => {
      dataContext.query.mockResolvedValue({ rows: mockDocuments });

      const documents = await documentRepository.getChatContextDocuments(
        { ids: [], chatId: randomUUID() },
        randomUUID()
      );

      expect(documents).toEqual(mockDocuments);
    });
  });

  describe("getAllUserChatDocuments", () => {
    it("should return an empty array when no documents are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const documents = await documentRepository.getAllUserChatDocuments(
        randomUUID()
      );

      expect(documents).toEqual([]);
    });
  });
});
