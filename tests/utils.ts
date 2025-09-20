import { Pool } from "pg";
import { Chat } from "../src/models/entities/chat";
import { Message } from "../src/models/entities/message";
import { RefreshToken } from "../src/models/entities/refresh-token";
import { Session } from "../src/models/entities/session";
import { User } from "../src/models/entities/user";
import { NumberUtils } from "../src/utils/numbers";
import { SqlUtils } from "../src/utils/sql";
import { testConfig } from "./config";

export function createTestPool() {
  return new Pool({
    host: testConfig.TEST_POSTGRES_HOST,
    port: NumberUtils.safeParseInt(testConfig.TEST_POSTGRES_PORT, 5432),
    user: testConfig.TEST_POSTGRES_USER,
    password: testConfig.TEST_POSTGRES_PASSWORD,
    database: testConfig.TEST_POSTGRES_DB,
  });
}

export async function insertUsers(users: User[], pool: Pool) {
  await pool.query(
    `INSERT INTO "user"
    (id, name, email, password, display_name, custom_preferences, created_at)
    VALUES
    ${SqlUtils.values(users.length, 7)};`,
    users.flatMap((user) => [
      user.id,
      user.name,
      user.email,
      user.password,
      user.displayName,
      user.customPreferences,
      user.createdAt,
    ])
  );
}

export async function truncateUsers(pool: Pool) {
  await pool.query(`TRUNCATE "user" CASCADE;`);
}

export async function insertSessions(sessions: Session[], pool: Pool) {
  await pool.query(
    `INSERT INTO "session"
    (id, user_id, created_at)
    VALUES
    ${SqlUtils.values(sessions.length, 3)};`,
    sessions.flatMap((session) => [
      session.id,
      session.userId,
      session.createdAt,
    ])
  );
}

export async function truncateSessions(pool: Pool) {
  await pool.query(`TRUNCATE "session" CASCADE;`);
}

export async function insertRefreshTokens(
  refreshTokens: RefreshToken[],
  pool: Pool
) {
  await pool.query(
    `INSERT INTO "refresh_token"
    (id, token, expires_at, is_revoked, session_id, created_at)
    VALUES
    ${SqlUtils.values(refreshTokens.length, 6)};`,
    refreshTokens.flatMap((token) => [
      token.id,
      token.token,
      token.expiresAt,
      token.isRevoked,
      token.sessionId,
      token.createdAt,
    ])
  );
}

export async function truncateRefreshTokens(pool: Pool) {
  await pool.query(`TRUNCATE "refresh_token" CASCADE;`);
}

export async function insertChats(chats: Chat[], pool: Pool) {
  await pool.query(
    `INSERT INTO "chat"
    (id, title, user_id, created_at)
    VALUES
    ${SqlUtils.values(chats.length, 4)};`,
    chats.flatMap((chat) => [chat.id, chat.title, chat.userId, chat.createdAt])
  );
}

export async function truncateChats(pool: Pool) {
  await pool.query(`TRUNCATE "chat" CASCADE;`);
}

export async function insertMessages(messages: Message[], pool: Pool) {
  await pool.query(
    `INSERT INTO "message"
    (id, role, content, chat_id, created_at)
    VALUES
    ${SqlUtils.values(messages.length, 5)};`,
    messages.flatMap((message) => [
      message.id,
      message.role,
      message.content,
      message.chatId,
      message.createdAt,
    ])
  );
}

export async function truncateMessages(pool: Pool) {
  await pool.query(`TRUNCATE "message" CASCADE;`);
}
