import { IDataContext } from "../data/context";
import { Chat } from "../models/entities/chat";
import { ArrayUtils } from "../utils/arrays";
import { NullablePartial, Paginated } from "../utils/types";

type ChatFilters = NullablePartial<Chat>;

export interface IChatRepository {
  exists(filters?: ChatFilters): Promise<boolean>;
  findAll(filters?: ChatFilters): Promise<Chat[]>;
  findAllPaginated(
    page: number,
    pageSize: number,
    filters?: ChatFilters
  ): Promise<Paginated<Chat>>;
  findOne(filters?: ChatFilters): Promise<Chat | null>;
  create(chat: Chat): Promise<void>;
  update(id: string, chat: NullablePartial<Chat>): Promise<void>;
  delete(id: string): Promise<void>;
}

export class ChatRepository implements IChatRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async exists(filters?: ChatFilters): Promise<boolean> {
    let paramsCount = 0;

    const result = await this.dataContext.query(
      `SELECT 1
      FROM "chat"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const exists = !ArrayUtils.isNullOrEmpty(result.rows);

    return exists;
  }

  async findAll(filters?: ChatFilters): Promise<Chat[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Chat>(
      `SELECT
        id,
        title,
        user_id AS "userId",
        created_at AS "createdAt"
      FROM "chat"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY created_at DESC;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    return result.rows;
  }

  async findAllPaginated(
    page: number,
    pageSize: number,
    filters?: ChatFilters
  ): Promise<Paginated<Chat>> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Chat & { totalItems: number }>(
      `SELECT
        id,
        title,
        user_id AS "userId",
        created_at AS "createdAt",
        (COUNT(1) OVER())::int AS "totalItems"
      FROM "chat"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY created_at DESC
      LIMIT $${++paramsCount}
      OFFSET $${++paramsCount};`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
        pageSize,
        (page - 1) * pageSize,
      ].filter((param) => param != null)
    );

    const totalItems = result.rows[0]?.totalItems ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return { items: result.rows, totalItems, page, pageSize, totalPages };
  }

  async findOne(filters?: ChatFilters): Promise<Chat | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Chat>(
      `SELECT
        id,
        title,
        user_id AS "userId",
        created_at AS "createdAt"
      FROM "chat"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const chat = ArrayUtils.firstOrNull(result.rows);

    return chat;
  }

  async create(chat: Chat): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "chat"
      (id, title, user_id)
      VALUES
      ($1, $2, $3);`,
      [chat.id, chat.title, chat.userId]
    );
  }

  async update(id: string, chat: NullablePartial<Chat>): Promise<void> {
    let paramsCount = 0;

    await this.dataContext.execute(
      `UPDATE "chat"
      SET
        ${chat.title != null ? `title = $${++paramsCount},` : ""}
        id = id
      WHERE
        id = $${++paramsCount};`,
      [chat.title, id].filter((param) => param != null)
    );
  }

  async delete(id: string): Promise<void> {
    await this.dataContext.execute(
      `DELETE FROM "chat"
      WHERE 
        id = $1;`,
      [id]
    );
  }
}
