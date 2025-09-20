import { IDataContext } from "../data/context";
import { Chat } from "../models/entities/chat";
import { Message, MessageRole } from "../models/entities/message";
import { ArrayUtils } from "../utils/arrays";
import { CursorPagination, NullablePartial } from "../utils/types";

type ChatFilters = NullablePartial<Chat & { includeMessages: boolean }>;

type ChatQueryRow = {
  chatId: string;
  chatTitle: string;
  chatUserId: string;
  chatCreatedAt?: Date;
  messageId: string;
  messageRole: MessageRole;
  messageContent: string;
  messageChatId: string;
  messageCreatedAt?: Date;
};

export interface IChatRepository {
  exists(filters?: ChatFilters): Promise<boolean>;
  findAll(filters?: ChatFilters): Promise<Chat[]>;
  findAllPaginated(
    cursor: Date,
    limit: number,
    filters?: ChatFilters
  ): Promise<CursorPagination<Chat>>;
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

    const result = await this.dataContext.query<ChatQueryRow>(
      `SELECT
        chat.id AS "chatId",
        chat.title AS "chatTitle",
        chat.user_id AS "chatUserId",
        chat.created_at AS "chatCreatedAt",
        ${
          filters?.includeMessages
            ? `message.id AS "messageId",
              message.role AS "messageRole",
              message.content AS "messageContent",
              message.chat_id AS "messageChatId",
              message.created_at AS "messageCreatedAt",`
            : ""
        }
        TRUE
      FROM "chat"
      ${
        filters?.includeMessages
          ? `LEFT JOIN "message" ON message.chat_id = chat.id`
          : ""
      }
      WHERE
        ${filters?.id != null ? `chat.id = $${++paramsCount} AND` : ""}
        ${
          filters?.title != null ? `chat.title ILIKE $${++paramsCount} AND` : ""
        }
        ${filters?.userId != null ? `chat.user_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY chat.created_at DESC;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const chats = this.mapRowsToChats(
      result.rows,
      Boolean(filters?.includeMessages)
    );

    return chats;
  }

  async findAllPaginated(
    cursor: Date,
    limit: number,
    filters?: ChatFilters
  ): Promise<CursorPagination<Chat>> {
    let paramsCount = 0;

    const result = await this.dataContext.query<
      ChatQueryRow & { totalItems: number }
    >(
      `WITH "chat_cte" AS (
        SELECT
          *,
          (COUNT(1) OVER())::int AS total_items
        FROM "chat"
        WHERE
          ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
          ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
          ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
          TRUE
        ORDER BY created_at DESC
      )
      SELECT
        chat_cte.id AS "chatId",
        chat_cte.title AS "chatTitle",
        chat_cte.user_id AS "chatUserId",
        chat_cte.created_at AS "chatCreatedAt",
        chat_cte.total_items AS "totalItems",
        ${
          filters?.includeMessages
            ? `message.id AS "messageId",
              message.role AS "messageRole",
              message.content AS "messageContent",
              message.chat_id AS "messageChatId",
              message.created_at AS "messageCreatedAt",`
            : ""
        }
        TRUE
      FROM "chat_cte"
      ${
        filters?.includeMessages
          ? `LEFT JOIN "message" ON message.chat_id = chat_cte.id`
          : ""
      }
      WHERE
        chat_cte.created_at < $${++paramsCount}
      ORDER BY 
        chat_cte.created_at DESC 
        ${filters?.includeMessages ? ", message.created_at" : ""}
      LIMIT $${++paramsCount};`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
        cursor,
        limit,
      ].filter((param) => param != null)
    );

    const chats = this.mapRowsToChats(
      result.rows,
      Boolean(filters?.includeMessages)
    );

    const totalItems = result.rows[0]?.totalItems ?? 0;

    return { items: chats, totalItems };
  }

  async findOne(filters?: ChatFilters): Promise<Chat | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<ChatQueryRow>(
      `WITH "chat_cte" AS (
        SELECT *
        FROM "chat"
        WHERE
          ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
          ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
          ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
          TRUE
        LIMIT 1
      )
      SELECT
        chat_cte.id AS "chatId",
        chat_cte.title AS "chatTitle",
        chat_cte.user_id AS "chatUserId",
        chat_cte.created_at AS "chatCreatedAt",
        ${
          filters?.includeMessages
            ? `message.id AS "messageId",
              message.role AS "messageRole",
              message.content AS "messageContent",
              message.chat_id AS "messageChatId",
              message.created_at AS "messageCreatedAt",`
            : ""
        }
        TRUE
      FROM "chat_cte"
      ${
        filters?.includeMessages
          ? `LEFT JOIN "message" ON message.chat_id = chat_cte.id`
          : ""
      };`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const chats = this.mapRowsToChats(
      result.rows,
      Boolean(filters?.includeMessages)
    );

    const chat = ArrayUtils.firstOrNull(chats);

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

  mapRowToChat(row: ChatQueryRow): Chat {
    return {
      id: row.chatId,
      title: row.chatTitle,
      userId: row.chatUserId,
      createdAt: row.chatCreatedAt,
    };
  }

  mapRowToMessage(row: ChatQueryRow): Message {
    return {
      id: row.messageId,
      role: row.messageRole,
      content: row.messageContent,
      chatId: row.messageChatId,
      createdAt: row.messageCreatedAt,
    };
  }

  mapRowsToChats(rows: ChatQueryRow[], includeMessages: boolean): Chat[] {
    const chats: Chat[] = [];

    let currentChat: Chat | null = null;

    for (const row of rows) {
      if (currentChat == null || row.chatId !== currentChat.id) {
        currentChat = this.mapRowToChat(row);
        chats.push(currentChat);
      }

      if (includeMessages && row.messageId != null) {
        const message = this.mapRowToMessage(row);

        if (currentChat.messages == null) {
          currentChat.messages = [];
        }

        currentChat.messages.push(message);
      }
    }

    return chats;
  }
}
