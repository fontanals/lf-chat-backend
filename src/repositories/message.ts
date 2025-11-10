import { IDataContext } from "../data/data-context";
import { AssistantMessage, Message } from "../models/entities/message";
import { ArrayUtils } from "../utils/arrays";
import { NullablePartial } from "../utils/types";

type MessageFilters = NullablePartial<Message>;

export interface IMessageRepository {
  exists(filters?: MessageFilters): Promise<boolean>;
  findAll(filters?: MessageFilters): Promise<Message[]>;
  create(message: Message): Promise<void>;
  update(id: string, message: NullablePartial<Message>): Promise<void>;
}

export class MessageRepository implements IMessageRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async exists(filters?: MessageFilters): Promise<boolean> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Message>(
      `SELECT 1
      FROM "message"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.role != null ? `role = $${++paramsCount} AND` : ""}
        ${
          filters?.parentMessageId != null
            ? `parent_message_id = $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.parentMessageId === null
            ? `parent_message_id IS NULL AND`
            : ""
        }
        ${filters?.chatId != null ? `chat_id = $${++paramsCount} AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.role,
        filters?.parentMessageId,
        filters?.chatId,
      ].filter((param) => param != null)
    );

    const exists = !ArrayUtils.isNullOrEmpty(result.rows);

    return exists;
  }

  async findAll(filters?: MessageFilters): Promise<Message[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Message>(
      `SELECT
        id,
        role,
        content,
        feedback,
        finish_reason AS "finishReason",
        parent_message_id AS "parentMessageId",
        chat_id AS "chatId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "message"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.role != null ? `role = $${++paramsCount} AND` : ""}
        ${
          filters?.parentMessageId != null
            ? `parent_message_id = $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.parentMessageId === null
            ? `parent_message_id IS NULL AND`
            : ""
        }
        ${filters?.chatId != null ? `chat_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY created_at;`,
      [
        filters?.id,
        filters?.role,
        filters?.parentMessageId,
        filters?.chatId,
      ].filter((param) => param != null)
    );

    return result.rows;
  }

  async create(message: Message): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "message"
      (id, role, content, feedback, finish_reason, parent_message_id, chat_id)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7);`,
      [
        message.id,
        message.role,
        JSON.stringify(message.content),
        message.feedback,
        message.finishReason,
        message.parentMessageId,
        message.chatId,
      ]
    );
  }

  async update(id: string, message: NullablePartial<Message>): Promise<void> {
    let paramsCount = 0;

    await this.dataContext.execute(
      `UPDATE "message"
      SET
        ${message.content != null ? `content = $${++paramsCount},` : ""}
        ${message.feedback != null ? `feedback = $${++paramsCount},` : ""}
        ${message.feedback === null ? "feedback = null," : ""}
        id = id
      WHERE
        id = $${++paramsCount};`,
      [
        message.content != null ? JSON.stringify(message.content) : null,
        (message as AssistantMessage).feedback,
        id,
      ].filter((param) => param != null)
    );
  }
}
