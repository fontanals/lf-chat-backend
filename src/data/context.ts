import { Pool, PoolClient } from "pg";

export type QueryResult<TRow extends Record<string, any>> = { rows: TRow[] };

export interface IDataContext {
  query<TRow extends Record<string, any> = Record<string, any>>(
    sql: string,
    params?: any[]
  ): Promise<QueryResult<TRow>>;
  execute(sql: string, params?: any[]): Promise<void>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class DataContext implements IDataContext {
  private readonly pool: Pool;
  private client: PoolClient | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async query<TRow extends Record<string, any> = Record<string, any>>(
    sql: string,
    params?: any[]
  ): Promise<QueryResult<TRow>> {
    const result = await (this.client ?? this.pool).query<TRow>(sql, params);

    return result;
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await (this.client ?? this.pool).query(sql, params);
  }

  async begin(): Promise<void> {
    if (this.client != null) {
      throw new Error("Client is already initialized.");
    }

    this.client = await this.pool.connect();

    await this.client.query("BEGIN;");
  }

  async commit(): Promise<void> {
    if (this.client == null) {
      throw new Error("Client is not initialized.");
    }

    try {
      await this.client.query("COMMIT;");
    } finally {
      this.client.release();
      this.client = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.client == null) {
      throw new Error("Client is not initialized.");
    }

    try {
      await this.client.query("ROLLBACK;");
    } finally {
      this.client.release();
      this.client = null;
    }
  }
}
