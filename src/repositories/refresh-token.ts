import { IDataContext } from "../data/data-context";
import { RefreshToken } from "../models/entities/refresh-token";
import { ArrayUtils } from "../utils/arrays";
import { NullablePartial } from "../utils/types";

type RefreshTokenFilters = NullablePartial<RefreshToken>;

export interface IRefreshTokenRepository {
  findAll(filters?: RefreshTokenFilters): Promise<RefreshToken[]>;
  findOne(filters?: RefreshTokenFilters): Promise<RefreshToken | null>;
  create(refreshToken: RefreshToken): Promise<void>;
  update(
    id: string,
    refreshToken: NullablePartial<RefreshToken>
  ): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
}

export class RefreshTokenRepository implements IRefreshTokenRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async findAll(filters?: RefreshTokenFilters): Promise<RefreshToken[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<RefreshToken>(
      `SELECT
        id,
        token,
        expires_at AS "expiresAt",
        is_revoked AS "isRevoked",
        session_id AS "sessionId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "refresh_token"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.token != null ? `token = $${++paramsCount} AND` : ""}
        ${
          filters?.sessionId != null ? `session_id = $${++paramsCount} AND` : ""
        }
        ${
          filters?.isRevoked != null ? `is_revoked = $${++paramsCount} AND` : ""
        }
        TRUE
      ORDER BY created_at;`,
      [
        filters?.id,
        filters?.token,
        filters?.sessionId,
        filters?.isRevoked,
      ].filter((param) => param != null)
    );

    return result.rows;
  }

  async findOne(filters?: RefreshTokenFilters): Promise<RefreshToken | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<RefreshToken>(
      `SELECT
        id,
        token,
        expires_at AS "expiresAt",
        is_revoked AS "isRevoked",
        session_id AS "sessionId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "refresh_token"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.token != null ? `token = $${++paramsCount} AND` : ""}
        ${
          filters?.sessionId != null ? `session_id = $${++paramsCount} AND` : ""
        }
        ${
          filters?.isRevoked != null ? `is_revoked = $${++paramsCount} AND` : ""
        }
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.token,
        filters?.sessionId,
        filters?.isRevoked,
      ].filter((param) => param != null)
    );

    const refreshToken = ArrayUtils.firstOrNull(result.rows);

    return refreshToken;
  }

  async create(refreshToken: RefreshToken): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "refresh_token" 
      (id, token, expires_at, is_revoked, session_id)
      VALUES 
      ($1, $2, $3, $4, $5);`,
      [
        refreshToken.id,
        refreshToken.token,
        refreshToken.expiresAt,
        refreshToken.isRevoked,
        refreshToken.sessionId,
      ]
    );
  }

  async update(
    id: string,
    refreshToken: NullablePartial<RefreshToken>
  ): Promise<void> {
    let paramsCount = 0;

    await this.dataContext.execute(
      `UPDATE "refresh_token"
      SET
        ${
          refreshToken.isRevoked != null
            ? `is_revoked = $${++paramsCount},`
            : ""
        }
        id = id
      WHERE
        id = $${++paramsCount};`,
      [refreshToken.isRevoked, id].filter((param) => param != null)
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.dataContext.execute(
      `UPDATE "refresh_token"
      SET 
        is_revoked = TRUE
      WHERE 
        session_id = $1;`,
      [sessionId]
    );
  }
}
