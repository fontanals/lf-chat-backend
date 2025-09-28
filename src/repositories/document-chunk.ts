import { IDataContext } from "../data/context";
import { DocumentChunk } from "../models/entities/document-chunk";
import { ArrayUtils } from "../utils/arrays";
import { SqlUtils } from "../utils/sql";

export interface IDocumentChunkRepository {
  createAll(documentChunks: DocumentChunk[]): Promise<void>;
}

export class DocumentChunkRepository implements IDocumentChunkRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async createAll(documentChunks: DocumentChunk[]): Promise<void> {
    if (ArrayUtils.isNullOrEmpty(documentChunks)) {
      return;
    }

    const params = documentChunks.flatMap((documentChunk) => [
      documentChunk.id,
      documentChunk.index,
      documentChunk.content,
      documentChunk.embedding,
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
