import { IDataContext } from "../data/data-context";
import { Document } from "../models/entities/document";
import { DocumentChunk } from "../models/entities/document-chunk";
import { ArrayUtils } from "../utils/arrays";
import { SqlUtils } from "../utils/sql";
import { NullablePartial } from "../utils/types";

type DocumentChunkQueryRow = {
  documentChunkId: string;
  documentChunkIndex: number;
  documentChunkContent: string;
  documentChunkDocumentId: string;
  documentChunkCreatedAt?: Date;
  documentId?: string;
  documentKey?: string;
  documentName?: string;
  documentMimetype?: string;
  documentSizeInBytes?: number;
  documentIsProcessed?: boolean;
  documentChatId?: string | null;
  documentProjectId?: string | null;
  documentUserId?: string;
  documentCreatedAt?: Date;
  documentUdpatedAt?: Date;
};

export type DocumentChunkFilters = NullablePartial<
  DocumentChunk & {
    chatId: string;
    projectId: string;
    includeDocument: boolean;
  }
>;

export interface IDocumentChunkRepository {
  findRelevant(
    embedding: number[],
    limit: number,
    filters?: DocumentChunkFilters
  ): Promise<DocumentChunk[]>;
  createAll(documentChunks: DocumentChunk[]): Promise<void>;
}

export class DocumentChunkRepository implements IDocumentChunkRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async findRelevant(
    embedding: number[],
    limit: number,
    filters?: DocumentChunkFilters
  ): Promise<DocumentChunk[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<DocumentChunkQueryRow>(
      `SELECT
        document_chunk.id AS "documentChunkId",
        document_chunk.index AS "documentChunkIndex",
        document_chunk.content AS "documentChunkContent",
        document_chunk.document_id AS "documentChunkDocumentId",
        document_chunk.created_at AS "documentChunkCreatedAt",
        ${
          filters?.includeDocument
            ? `document.id AS "documentId",
              document.key AS "documentKey",
              document.name AS "documentName",
              document.mimetype AS "documentMimetype",
              document.size_in_bytes AS "documentSizeInBytes",
              document.is_processed AS "documentIsProcessed",
              document.chat_id AS "documentChatId",
              document.project_id AS "documentProjectId",
              document.user_id AS "documentUserId",
              document.created_at AS "documentCreatedAt",
              document.updated_at AS "documentUpdatedAt",`
            : ""
        }
        1 - (document_chunk.embedding <-> $${++paramsCount}) AS distance
      FROM "document_chunk"
      ${
        filters?.chatId != null || filters?.projectId != null
          ? "JOIN document ON document.id = document_chunk.document_id"
          : ""
      }
      WHERE
        ${
          filters?.documentId != null
            ? `document_chunk.document_id = $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.chatId != null
            ? `document.chat_id = $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.projectId != null
            ? `document.project_id = $${++paramsCount} AND`
            : ""
        }
        TRUE
      ORDER BY distance
      LIMIT $${++paramsCount};`,
      [
        JSON.stringify(embedding),
        filters?.documentId,
        filters?.chatId,
        filters?.projectId,
        limit,
      ].filter((param) => param != null)
    );

    const documentChunks = this.mapRowsToDocumentChunks(
      result.rows,
      Boolean(filters?.includeDocument)
    );

    return documentChunks;
  }

  async createAll(documentChunks: DocumentChunk[]): Promise<void> {
    if (ArrayUtils.isNullOrEmpty(documentChunks)) {
      return;
    }

    const params = documentChunks.flatMap((documentChunk) => [
      documentChunk.id,
      documentChunk.index,
      documentChunk.content,
      JSON.stringify(documentChunk.embedding),
      documentChunk.documentId,
    ]);

    await this.dataContext.execute(
      `INSERT INTO "document_chunk"
      (id, index, content, embedding, document_id)
      VALUES
      ${SqlUtils.values(documentChunks.length, 5)};`,
      params
    );
  }

  mapRowToDocumentChunk(
    row: DocumentChunkQueryRow,
    includeDocument: boolean
  ): DocumentChunk {
    return {
      id: row.documentChunkId,
      index: row.documentChunkIndex,
      content: row.documentChunkContent,
      documentId: row.documentChunkDocumentId,
      embedding: [],
      document: includeDocument ? this.mapRowToDocument(row) : undefined,
    };
  }

  mapRowToDocument(row: DocumentChunkQueryRow): Document {
    return {
      id: row.documentId!,
      key: row.documentKey!,
      name: row.documentName!,
      mimetype: row.documentMimetype!,
      sizeInBytes: row.documentSizeInBytes!,
      isProcessed: row.documentIsProcessed!,
      chatId: row.documentChatId,
      projectId: row.documentProjectId,
      userId: row.documentUserId!,
      createdAt: row.documentCreatedAt,
      udpatedAt: row.documentUdpatedAt,
    };
  }

  mapRowsToDocumentChunks(
    rows: DocumentChunkQueryRow[],
    includeDocument: boolean
  ): DocumentChunk[] {
    return rows.map((row) => this.mapRowToDocumentChunk(row, includeDocument));
  }
}
