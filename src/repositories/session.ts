import { IDataContext } from "../data/context";
import { Session } from "../models/entities/session";
import { ArrayUtils } from "../utils/arrays";
import { NullablePartial } from "../utils/types";

type SessionFilters = NullablePartial<Session>;

export interface ISessionRepository {
  findAll(filters?: SessionFilters): Promise<Session[]>;
  findOne(filters?: SessionFilters): Promise<Session | null>;
  create(session: Session): Promise<void>;
}

export class SessionRepository implements ISessionRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async findAll(filters?: SessionFilters): Promise<Session[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Session>(
      `SELECT
        id,
        expires_at AS "expiresAt",
        user_id AS "userId",
        created_at AS "createdAt"
      FROM "session"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      ORDER BY created_at;`,
      [filters?.id, filters?.userId].filter((param) => param != null)
    );

    return result.rows;
  }

  async findOne(filters?: SessionFilters): Promise<Session | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<Session>(
      `SELECT
        id,
        expires_at AS "expiresAt",
        user_id AS "userId",
        created_at AS "createdAt"
      FROM "session"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      LIMIT 1;`,
      [filters?.id, filters?.userId].filter((param) => param != null)
    );

    const session = ArrayUtils.firstOrNull(result.rows);

    return session;
  }

  async create(session: Session): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "session" 
      (id, expires_at, user_id)
      VALUES 
      ($1, $2, $3);`,
      [session.id, session.expiresAt, session.userId]
    );
  }
}
