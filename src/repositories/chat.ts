import { IDataContext } from "../data/data-context";
import { Chat } from "../models/entities/chat";
import { Project } from "../models/entities/project";
import { ArrayUtils } from "../utils/arrays";
import { NumberUtils } from "../utils/numbers";
import { CursorPagination, NullablePartial } from "../utils/types";

type ChatQueryRow = {
  chatId: string;
  chatTitle: string;
  chatProjectId?: string | null;
  chatUserId: string;
  chatCreatedAt?: Date;
  chatUpdatedAt?: Date;
  projectId?: string;
  projectTitle?: string;
  projectDescription?: string;
  projectUserId?: string;
  projectCreatedAt?: Date;
  projectUpdatedAt?: Date;
};

type ChatFilters = NullablePartial<Chat & { includeProject: boolean }>;

export interface IChatRepository {
  exists(filters?: ChatFilters): Promise<boolean>;
  findAll(filters?: ChatFilters): Promise<Chat[]>;
  findAllPaginated(
    cursor: Date,
    limit: number,
    filters?: ChatFilters
  ): Promise<CursorPagination<Chat, Date>>;
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
        ${
          filters?.projectId != null ? `project_id = $${++paramsCount} AND` : ""
        }
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.projectId,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const exists = !ArrayUtils.isNullOrEmpty(result.rows);

    return exists;
  }

  async findAll(filters?: ChatFilters): Promise<Chat[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<ChatQueryRow>(
      `SELECT
        chat.id AS "chatId",
        chat.title AS "chatTitle",
        chat.project_id AS "chatProjectId",
        chat.user_id AS "chatUserId",
        chat.created_at AS "chatCreatedAt",
        chat.updated_at AS "chatUpdatedAt"
        ${
          filters?.includeProject
            ? `, project.id AS "projectId",
              project.title AS "projectTitle",
              project.description AS "projectDescription",
              project.user_id AS "projectUserId",
              project.created_at AS "projectCreatedAt",
              project.updated_at AS "projectUpdatedAt"`
            : ""
        }
      FROM "chat"
      ${
        filters?.includeProject
          ? `LEFT JOIN "project" ON project.id = chat.project_id`
          : ""
      }
      WHERE
        ${filters?.id != null ? `chat.id = $${++paramsCount} AND` : ""}
        ${
          filters?.title != null ? `chat.title ILIKE $${++paramsCount} AND` : ""
        }
        ${
          filters?.projectId != null
            ? `chat.project_id = $${++paramsCount} AND`
            : ""
        }
        ${filters?.userId != null ? `chat.user_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY chat.created_at DESC;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.projectId,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const chats = this.mapRowsToChats(
      result.rows,
      Boolean(filters?.includeProject)
    );

    return chats;
  }

  async findAllPaginated(
    cursor: Date,
    limit: number,
    filters?: ChatFilters
  ): Promise<CursorPagination<Chat, Date>> {
    let paramsCount = 0;

    const result = await this.dataContext.query<
      ChatQueryRow & { totalItems: string }
    >(
      `WITH "chat_cte" AS (
        SELECT
          *,
          COUNT(1) OVER() AS total_items
        FROM "chat"
        WHERE
          ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
          ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
          ${
            filters?.projectId != null
              ? `project_id = $${++paramsCount} AND`
              : ""
          }
          ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
          TRUE
        ORDER BY created_at DESC
      )
      SELECT
        chat_cte.id AS "chatId",
        chat_cte.title AS "chatTitle",
        chat_cte.project_id AS "chatProjectId",
        chat_cte.user_id AS "chatUserId",
        chat_cte.created_at AS "chatCreatedAt",
        chat_cte.updated_at AS "chatUpdatedAt",
        chat_cte.total_items AS "totalItems"
        ${
          filters?.includeProject
            ? `, project.id AS "projectId",
              project.title AS "projectTitle",
              project.description AS "projectDescription",
              project.user_id AS "projectUserId",
              project.created_at AS "projectCreatedAt",
              project.updated_at AS "projectUpdatedAt"`
            : ""
        }
      FROM "chat_cte"
      ${
        filters?.includeProject
          ? `LEFT JOIN "project" ON project.id = chat_cte.project_id`
          : ""
      }
      WHERE
        chat_cte.created_at <= $${++paramsCount}
      ORDER BY chat_cte.created_at DESC 
      LIMIT $${++paramsCount};`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.projectId,
        filters?.userId,
        cursor,
        limit + 1,
      ].filter((param) => param != null)
    );

    const chats = this.mapRowsToChats(
      result.rows,
      Boolean(filters?.includeProject)
    );

    const paginatedChats: CursorPagination<Chat, Date> = {
      items: chats.slice(0, limit),
      totalItems: NumberUtils.safeParseInt(result.rows[0]?.totalItems, 0),
      nextCursor: chats.length > limit ? chats[limit].createdAt : undefined,
    };

    return paginatedChats;
  }

  async findOne(filters?: ChatFilters): Promise<Chat | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<ChatQueryRow>(
      `SELECT
        chat.id AS "chatId",
        chat.title AS "chatTitle",
        chat.project_id AS "chatProjectId",
        chat.user_id AS "chatUserId",
        chat.created_at AS "chatCreatedAt",
        chat.updated_at AS "chatUpdatedAt"
        ${
          filters?.includeProject
            ? `, project.id AS "projectId",
              project.title AS "projectTitle",
              project.description AS "projectDescription",
              project.user_id AS "projectUserId",
              project.created_at AS "projectCreatedAt",
              project.updated_at AS "projectUpdatedAt"`
            : ""
        }
      FROM "chat"
      ${
        filters?.includeProject
          ? `LEFT JOIN "project" ON project.id = chat.project_id`
          : ""
      }
      WHERE
        ${filters?.id != null ? `chat.id = $${++paramsCount} AND` : ""}
        ${
          filters?.title != null ? `chat.title ILIKE $${++paramsCount} AND` : ""
        }
        ${
          filters?.projectId != null
            ? `chat.project_id = $${++paramsCount} AND`
            : ""
        }
        ${filters?.userId != null ? `chat.user_id = $${++paramsCount} AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.projectId,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const chats = this.mapRowsToChats(
      result.rows,
      Boolean(filters?.includeProject)
    );

    const chat = ArrayUtils.firstOrNull(chats);

    return chat;
  }

  async create(chat: Chat): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "chat"
      (id, title, project_id, user_id)
      VALUES
      ($1, $2, $3, $4);`,
      [chat.id, chat.title, chat.projectId, chat.userId]
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

  mapRowToChat(row: ChatQueryRow, includeProject: boolean): Chat {
    return {
      id: row.chatId,
      title: row.chatTitle,
      projectId: row.chatProjectId,
      userId: row.chatUserId,
      createdAt: row.chatCreatedAt,
      updatedAt: row.chatUpdatedAt,
      project: includeProject ? this.mapRowToProject(row) : null,
    };
  }

  mapRowToProject(row: ChatQueryRow): Project | null {
    if (row.projectId == null) {
      return null;
    }

    return {
      id: row.projectId,
      title: row.projectTitle!,
      description: row.projectDescription!,
      userId: row.projectUserId!,
      createdAt: row.projectCreatedAt,
      updatedAt: row.projectUpdatedAt,
    };
  }

  mapRowsToChats(rows: ChatQueryRow[], includeProject: boolean): Chat[] {
    return rows.map((row) => this.mapRowToChat(row, includeProject));
  }
}
