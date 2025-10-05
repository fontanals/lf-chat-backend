import { IDataContext } from "../data/context";
import { DocumentChunk } from "../models/entities/document-chunk";
import { ArrayUtils } from "../utils/arrays";
import { SqlUtils } from "../utils/sql";
import { NullablePartial } from "../utils/types";

export type DocumentChunkFilters = NullablePartial<
  DocumentChunk & { projectId: string; limit: number }
>;

export interface IDocumentChunkRepository {
  findRelevant(
    query: string,
    threshold: number,
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
    query: string,
    threshold: number,
    filters?: DocumentChunkFilters
  ): Promise<DocumentChunk[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<DocumentChunk>(
      `SELECT
        document_chunk.id,
        document_chunk.index,
        document_chunk.content,
        document_chunk.embedding,
        document_chunk.document_id AS "documentId",
        document_chunk.created_at AS "createdAt",
        1 - (document_chunk.embedding <-> $${++paramsCount}) AS distance
      FROM "document_chunk"
      ${
        filters?.projectId != null
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
          filters?.projectId != null
            ? `document.project_id = $${++paramsCount} AND`
            : ""
        }
        document_chunk.embedding <-> $${++paramsCount} > $${++paramsCount}
      ORDER BY distance
      ${filters?.limit != null ? `LIMIT $${++paramsCount}` : ""};`,
      [
        filters?.documentId,
        filters?.projectId,
        query,
        threshold,
        filters?.limit,
      ].filter((param) => param != null)
    );

    return result.rows;
  }

  async createAll(documentChunks: DocumentChunk[]): Promise<void> {
    if (ArrayUtils.isNullOrEmpty(documentChunks)) {
      return;
    }

    const params = documentChunks.flatMap((documentChunk) => [
      documentChunk.id,
      documentChunk.index,
      documentChunk.content,
      SqlUtils.vectorToSql(documentChunk.embedding),
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
}
