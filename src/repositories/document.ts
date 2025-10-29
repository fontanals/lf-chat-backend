import { IDataContext } from "../data/context";
import { Document } from "../models/entities/document";
import { ArrayUtils } from "../utils/arrays";
import { NullablePartial } from "../utils/types";

export type DocumentFilters = NullablePartial<Document & { ids: string[] }>;

export interface IDocumentRepository {
  exists(filters?: DocumentFilters): Promise<boolean>;
  findAll(filters?: DocumentFilters): Promise<Document[]>;
  findOne(filters?: DocumentFilters): Promise<Document | null>;
  create(document: Document): Promise<void>;
  update(id: string, document: NullablePartial<Document>): Promise<void>;
  delete(id: string): Promise<void>;
  getChatAndProjectDocuments(
    chatId: string,
    projectId?: string | null
  ): Promise<Document[]>;
}

export class DocumentRepository implements IDocumentRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async exists(filters?: DocumentFilters): Promise<boolean> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Document>(
      `SELECT 1
      FROM "document"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.path != null ? `path = $${++paramsCount} AND` : ""}
        ${filters?.chatId != null ? `chat_id = $${++paramsCount} AND` : ""}
        ${
          filters?.projectId != null ? `project_id = $${++paramsCount} AND` : ""
        }
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        ${filters?.ids != null ? `id = ANY($${++paramsCount}) AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.path,
        filters?.chatId,
        filters?.projectId,
        filters?.userId,
        filters?.ids,
      ].filter((param) => param != null)
    );

    const exists = !ArrayUtils.isNullOrEmpty(result.rows);

    return exists;
  }

  async findAll(filters?: DocumentFilters): Promise<Document[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Document>(
      `SELECT
        id,
        name,
        path,
        mimetype,
        size_in_bytes AS "sizeInBytes",
        chat_id AS "chatId",
        project_id AS "projectId",
        user_id AS "userId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "document"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.path != null ? `path = $${++paramsCount} AND` : ""}
        ${filters?.chatId != null ? `chat_id = $${++paramsCount} AND` : ""}
        ${
          filters?.projectId != null ? `project_id = $${++paramsCount} AND` : ""
        }
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        ${filters?.ids != null ? `id = ANY($${++paramsCount}) AND` : ""}
        TRUE
      ORDER BY created_at;`,
      [
        filters?.id,
        filters?.path,
        filters?.chatId,
        filters?.projectId,
        filters?.userId,
        filters?.ids,
      ].filter((param) => param != null)
    );

    return result.rows;
  }

  async findOne(filters?: DocumentFilters): Promise<Document | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Document>(
      `SELECT
        id,
        name,
        path,
        mimetype,
        size_in_bytes AS "sizeInBytes",
        chat_id AS "chatId",
        project_id AS "projectId",
        user_id AS "userId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "document"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.path != null ? `path = $${++paramsCount} AND` : ""}
        ${filters?.chatId != null ? `chat_id = $${++paramsCount} AND` : ""}
        ${
          filters?.projectId != null ? `project_id = $${++paramsCount} AND` : ""
        }
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        ${filters?.ids != null ? `id = ANY($${++paramsCount}) AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.path,
        filters?.chatId,
        filters?.projectId,
        filters?.userId,
        filters?.ids,
      ].filter((param) => param != null)
    );

    const document = ArrayUtils.firstOrNull(result.rows);

    return document;
  }

  async create(document: Document): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "document"
      (id, name, path, mimetype, size_in_bytes, chat_id, project_id, user_id)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [
        document.id,
        document.name,
        document.path,
        document.mimetype,
        document.sizeInBytes,
        document.chatId,
        document.projectId,
        document.userId,
      ]
    );
  }

  async update(id: string, document: NullablePartial<Document>): Promise<void> {
    let paramsCount = 0;

    await this.dataContext.execute(
      `UPDATE "document"
      SET
        ${document.name != null ? `name = $${++paramsCount},` : ""}
        ${document.chatId != null ? `chat_id = $${++paramsCount},` : ""}
        ${document.chatId === null ? `chat_id = NULL,` : ""}
        ${document.projectId != null ? `project_id = $${++paramsCount},` : ""}
        ${document.projectId === null ? `project_id = NULL,` : ""}
        id = id
      WHERE
        id = $${++paramsCount};`,
      [document.name, document.chatId, document.projectId, id].filter(
        (param) => param != null
      )
    );
  }

  async delete(id: string): Promise<void> {
    await this.dataContext.execute(
      `DELETE FROM "document"
      WHERE
        id = $1;`,
      [id]
    );
  }

  async getChatAndProjectDocuments(
    chatId: string,
    projectId?: string | null
  ): Promise<Document[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Document>(
      `SELECT
        id,
        name,
        path,
        mimetype,
        size_in_bytes AS "sizeInBytes",
        chat_id AS "chatId",
        project_id AS "projectId",
        user_id AS "userId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "document"
      WHERE
        chat_id = $${++paramsCount} AND
        ${projectId != null ? `project_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY created_at;`,
      [chatId, projectId].filter((param) => param != null)
    );

    return result.rows;
  }
}
