import { randomUUID } from "crypto";
import fs from "fs/promises";
import parsePdf from "pdf-parse";
import { config } from "../config";
import { Document } from "../models/entities/document";
import { DocumentChunk } from "../models/entities/document-chunk";
import { IDocumentRepository } from "../repositories/document";
import { IDocumentChunkRepository } from "../repositories/document-chunk";

export interface IDocumentManager {
  getDocuments(ids: string[], includeContent?: boolean): Promise<Document[]>;
  getChatDocuments(
    chatId: string,
    includeContent?: boolean
  ): Promise<Document[]>;
  getProjectRelevantDocumentChunks(
    query: string,
    projectId: string
  ): Promise<DocumentChunk[]>;
  getDocument(
    id: string,
    userId?: string,
    includeContent?: boolean
  ): Promise<Document | null>;
  createDocument(
    file: Express.Multer.File,
    userId: string,
    chatId?: string,
    projectId?: string
  ): Promise<string>;
  processDocument(document: Document): Promise<string>;
  updateDocument(document: Document): Promise<string>;
  deleteDocument(document: Document): Promise<string>;
}

export class DocumentManager implements IDocumentManager {
  private readonly documentRepository: IDocumentRepository;
  private readonly documentChunkRepository: IDocumentChunkRepository;

  constructor(
    documentRepository: IDocumentRepository,
    documentChunkRepository: IDocumentChunkRepository
  ) {
    this.documentRepository = documentRepository;
    this.documentChunkRepository = documentChunkRepository;
  }

  async getDocuments(
    ids: string[],
    includeContent = false
  ): Promise<Document[]> {
    const documents = await this.documentRepository.findAll({ ids });

    if (includeContent) {
      for (const document of documents) {
        const buffer = await fs.readFile(document.path);

        const pdf = await parsePdf(buffer);

        document.content = pdf.text;
      }
    }

    return documents;
  }

  async getChatDocuments(
    chatId: string,
    includeContent?: boolean
  ): Promise<Document[]> {
    const documents = await this.documentRepository.findAll({ chatId });

    if (includeContent) {
      for (const document of documents) {
        const buffer = await fs.readFile(document.path);

        const pdf = await parsePdf(buffer);

        document.content = pdf.text;
      }
    }

    return documents;
  }

  async getProjectRelevantDocumentChunks(
    query: string,
    projectId: string
  ): Promise<DocumentChunk[]> {
    return [];
  }

  async getDocument(
    id: string,
    userId?: string,
    includeContent?: boolean
  ): Promise<Document | null> {
    const document = await this.documentRepository.findOne({ id, userId });

    if (document != null && includeContent) {
      const buffer = await fs.readFile(document.path);

      const pdf = await parsePdf(buffer);

      document.content = pdf.text;
    }

    return document;
  }

  async createDocument(
    file: Express.Multer.File,
    userId: string,
    chatId?: string,
    projectId?: string
  ): Promise<string> {
    const document: Document = {
      id: randomUUID(),
      name: file.originalname,
      path: `${config.UPLOADS_PATH}/${file.originalname}`,
      mimetype: file.mimetype,
      size: file.size,
      chatId,
      projectId,
      userId,
    };

    await fs.writeFile(document.path, file.buffer);

    await this.documentRepository.create(document);

    if (projectId != null) {
      await this.processDocument(document);
    }

    return document.id;
  }

  async processDocument(document: Document): Promise<string> {
    const buffer = await fs.readFile(document.path);

    const pdf = await parsePdf(buffer);

    const documentChunks = this.chunkDocument(document, pdf.text);

    await this.documentChunkRepository.createAll(documentChunks);

    return document.id;
  }

  async updateDocument(document: Document): Promise<string> {
    await this.documentRepository.update(document.id, document);

    return document.id;
  }

  async deleteDocument(document: Document): Promise<string> {
    await fs.rm(document.path);

    await this.documentRepository.delete(document.id);

    return document.id;
  }

  chunkDocument(document: Document, content: string) {
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
        documentId: document.id,
      };

      documentChunks.push(documentChunk);

      index += chunkSize - overlap;
    }

    return documentChunks;
  }
}
