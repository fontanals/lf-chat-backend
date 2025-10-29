import { randomUUID } from "crypto";
import path from "path";
import parsePdf from "pdf-parse";
import { config } from "../config";
import { Document } from "../models/entities/document";
import { DocumentChunk } from "../models/entities/document-chunk";
import { DocumentFilters, IDocumentRepository } from "../repositories/document";
import {
  DocumentChunkFilters,
  IDocumentChunkRepository,
} from "../repositories/document-chunk";
import { FileSystemUtils } from "../utils/file-system";
import { NullablePartial } from "../utils/types";
import { IAssistantService } from "./assistant";

export interface IDocumentManager {
  documentExists(filters?: DocumentFilters): Promise<boolean>;
  getDocuments(filters?: DocumentFilters): Promise<Document[]>;
  getChatAndProjectDocuments(
    chatId: string,
    projectId?: string | null
  ): Promise<Document[]>;
  getDocument(filters?: DocumentFilters): Promise<Document | null>;
  getRelevantDocumentChunks(
    query: string,
    threshold: number,
    filters?: DocumentChunkFilters
  ): Promise<DocumentChunk[]>;
  createDocument(document: Document, file: Express.Multer.File): Promise<void>;
  processDocument(id: string): Promise<void>;
  updateDocument(
    id: string,
    document: NullablePartial<Document>
  ): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}

export class DocumentManager implements IDocumentManager {
  private readonly documentRepository: IDocumentRepository;
  private readonly documentChunkRepository: IDocumentChunkRepository;
  private readonly assistantService: IAssistantService;

  constructor(
    documentRepository: IDocumentRepository,
    documentChunkRepository: IDocumentChunkRepository,
    assistantService: IAssistantService
  ) {
    this.documentRepository = documentRepository;
    this.documentChunkRepository = documentChunkRepository;
    this.assistantService = assistantService;
  }

  async documentExists(filters?: DocumentFilters): Promise<boolean> {
    const exists = await this.documentRepository.exists(filters);

    return exists;
  }

  async getDocuments(filters?: DocumentFilters): Promise<Document[]> {
    const documents = await this.documentRepository.findAll(filters);

    return documents;
  }

  async getDocument(filters?: DocumentFilters): Promise<Document | null> {
    const document = await this.documentRepository.findOne(filters);

    return document;
  }

  async getChatAndProjectDocuments(
    chatId: string,
    projectId?: string | null
  ): Promise<Document[]> {
    const documents = await this.documentRepository.getChatAndProjectDocuments(
      chatId,
      projectId
    );

    return documents;
  }

  async getRelevantDocumentChunks(
    query: string,
    threshold: number,
    filters?: DocumentChunkFilters
  ): Promise<DocumentChunk[]> {
    const documentChunks = await this.documentChunkRepository.findRelevant(
      query,
      threshold,
      filters
    );

    return documentChunks;
  }

  async createDocument(
    document: Document,
    file: Express.Multer.File
  ): Promise<void> {
    await FileSystemUtils.ensureDirectoryExists(
      path.join(config.UPLOADS_PATH, document.userId)
    );

    const documentPath = path.join(
      config.UPLOADS_PATH,
      document.userId,
      `${document.id}_${file.originalname}`
    );

    await FileSystemUtils.writeFile(documentPath, file.buffer);

    document.path = documentPath;

    await this.documentRepository.create(document);
  }

  async processDocument(id: string): Promise<void> {
    const document = await this.documentRepository.findOne({ id });

    if (document == null) {
      throw new Error("Document not found.");
    }

    const content = await FileSystemUtils.readFile(document.path);

    let textContent = "";

    switch (document.mimetype) {
      case "text/plain": {
        textContent = content.toString("utf-8");

        break;
      }
      case "application/pdf": {
        const pdf = await parsePdf(content);

        textContent = pdf.text;

        break;
      }
    }

    const documentChunks = await this.chunkDocumentContent(
      document.id,
      textContent
    );

    const generateEmbeddingPromises = documentChunks.map(
      async (documentChunk) => {
        const embedding = await this.assistantService.generateEmbedding(
          documentChunk.content
        );

        documentChunk.embedding = embedding;
      }
    );

    await Promise.all(generateEmbeddingPromises);

    await this.documentChunkRepository.createAll(documentChunks);
  }

  async updateDocument(
    id: string,
    document: NullablePartial<Document>
  ): Promise<void> {
    await this.documentRepository.update(id, document);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.documentRepository.delete(id);
  }

  private async chunkDocumentContent(documentId: string, content: string) {
    const chunkSize = 500;
    const overlap = 50;

    const words = content.split(/\s+/).filter(Boolean);

    const documentChunks: DocumentChunk[] = [];

    let index = 0;

    while (index < words.length) {
      const end = index + chunkSize;

      const documentChunk: DocumentChunk = {
        id: randomUUID(),
        index: documentChunks.length,
        content: words.slice(index, end).join(" "),
        embedding: [],
        documentId,
      };

      documentChunks.push(documentChunk);

      index += chunkSize - overlap;
    }

    return documentChunks;
  }
}
