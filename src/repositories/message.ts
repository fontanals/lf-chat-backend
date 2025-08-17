import { IDataContext } from "../data/context";
import { Message } from "../models/entities/message";
import { NullablePartial } from "../utils/types";

type MessageFilters = NullablePartial<Message>;

export interface IMessageRepository {
  findAll(filters?: MessageFilters): Promise<Message[]>;
  create(message: Message): Promise<void>;
}

export class MessageRepository implements IMessageRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async findAll(filters?: MessageFilters): Promise<Message[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Message>(
      `SELECT
        id,
        role,
        content,
        chat_id AS "chatId",
        created_at AS "createdAt"
      FROM "message"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.role != null ? `role = $${++paramsCount} AND` : ""}
        ${filters?.chatId != null ? `chat_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY created_at;`,
      [filters?.id, filters?.role, filters?.chatId].filter(
        (param) => param != null
      )
    );

    return result.rows;
  }

  async create(message: Message): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "message"
      (id, role, content, chat_id)
      VALUES
      ($1, $2, $3, $4);`,
      [message.id, message.role, message.content, message.chatId]
    );
  }
}
