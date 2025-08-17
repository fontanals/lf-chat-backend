import { Pool } from "pg";
import { config } from "../config";
import { NumberUtils } from "../utils/numbers";

export const pool = new Pool({
  host: config.POSTGRES_HOST,
  port: NumberUtils.safeParseInt(config.POSTGRES_PORT, 5432),
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
});
