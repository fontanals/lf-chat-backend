import { Pool } from "pg";
import { config } from "../src/config";
import { Chat } from "../src/models/entities/chat";
import { Document } from "../src/models/entities/document";
import { DocumentChunk } from "../src/models/entities/document-chunk";
import { Message } from "../src/models/entities/message";
import { Project } from "../src/models/entities/project";
import { RefreshToken } from "../src/models/entities/refresh-token";
import { Session } from "../src/models/entities/session";
import { User } from "../src/models/entities/user";
import { SqlUtils } from "../src/utils/sql";

export function createTestPool() {
  return new Pool({
    host: config.POSTGRES_HOST,
    port: config.POSTGRES_PORT,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
    database: config.POSTGRES_DB,
  });
}

export async function insertUsers(users: User[], pool: Pool) {
  await pool.query(
    `INSERT INTO "user"
    (id, name, email, password, display_name, custom_prompt, created_at, updated_at)
    VALUES
    ${SqlUtils.values(users.length, 8)};`,
    users.flatMap((user) => [
      user.id,
      user.name,
      user.email,
      user.password,
      user.displayName,
      user.customPrompt,
      user.createdAt,
      user.updatedAt,
    ])
  );
}

export async function insertSessions(sessions: Session[], pool: Pool) {
  await pool.query(
    `INSERT INTO "session"
    (id, expires_at, user_id, created_at)
    VALUES
    ${SqlUtils.values(sessions.length, 4)};`,
    sessions.flatMap((session) => [
      session.id,
      session.expiresAt,
      session.userId,
      session.createdAt,
    ])
  );
}

export async function insertRefreshTokens(
  refreshTokens: RefreshToken[],
  pool: Pool
) {
  await pool.query(
    `INSERT INTO "refresh_token"
    (id, token, expires_at, is_revoked, session_id, created_at, updated_at)
    VALUES
    ${SqlUtils.values(refreshTokens.length, 7)};`,
    refreshTokens.flatMap((refreshToken) => [
      refreshToken.id,
      refreshToken.token,
      refreshToken.expiresAt,
      refreshToken.isRevoked,
      refreshToken.sessionId,
      refreshToken.createdAt,
      refreshToken.updatedAt,
    ])
  );
}

export async function insertProjects(projects: Project[], pool: Pool) {
  await pool.query(
    `INSERT INTO "project"
    (id, title, description, user_id, created_at, updated_at)
    VALUES
    ${SqlUtils.values(projects.length, 6)};`,
    projects.flatMap((project) => [
      project.id,
      project.title,
      project.description,
      project.userId,
      project.createdAt,
      project.updatedAt,
    ])
  );
}

export async function insertChats(chats: Chat[], pool: Pool) {
  await pool.query(
    `INSERT INTO "chat"
    (id, title, project_id, user_id, created_at, updated_at)
    VALUES
    ${SqlUtils.values(chats.length, 6)};`,
    chats.flatMap((chat) => [
      chat.id,
      chat.title,
      chat.projectId,
      chat.userId,
      chat.createdAt,
      chat.updatedAt,
    ])
  );
}

export async function insertMessages(messages: Message[], pool: Pool) {
  await pool.query(
    `INSERT INTO "message"
    (id, role, content, feedback, finish_reason, parent_message_id, chat_id, created_at, updated_at)
    VALUES
    ${SqlUtils.values(messages.length, 9)};`,
    messages.flatMap((message) => [
      message.id,
      message.role,
      JSON.stringify(message.content),
      message.feedback,
      message.finishReason,
      message.parentMessageId,
      message.chatId,
      message.createdAt,
      message.updatedAt,
    ])
  );
}

export async function insertDocuments(documents: Document[], pool: Pool) {
  await pool.query(
    `INSERT INTO "document"
    (id, key, name, mimetype, size_in_bytes, is_processed, chat_id, project_id, user_id, created_at, updated_at)
    VALUES
    ${SqlUtils.values(documents.length, 11)};`,
    documents.flatMap((document) => [
      document.id,
      document.key,
      document.name,
      document.mimetype,
      document.sizeInBytes,
      document.isProcessed,
      document.chatId,
      document.projectId,
      document.userId,
      document.createdAt,
      document.updatedAt,
    ])
  );
}

export async function insertDocumentChunks(
  documentChunks: DocumentChunk[],
  pool: Pool
) {
  await pool.query(
    `INSERT INTO "document_chunk"
    (id, index, content, embedding, document_id, created_at)
    VALUES
    ${SqlUtils.values(documentChunks.length, 6)};`,
    documentChunks.flatMap((chunk) => [
      chunk.id,
      chunk.index,
      chunk.content,
      JSON.stringify(chunk.embedding),
      chunk.documentId,
      chunk.createdAt,
    ])
  );
}

export async function truncateUsers(pool: Pool) {
  await pool.query(`TRUNCATE "user" CASCADE;`);
}

export async function truncateSessions(pool: Pool) {
  await pool.query(`TRUNCATE "session" CASCADE;`);
}

export async function truncateRefreshTokens(pool: Pool) {
  await pool.query(`TRUNCATE "refresh_token" CASCADE;`);
}

export async function truncateProjects(pool: Pool) {
  await pool.query(`TRUNCATE "project" CASCADE;`);
}

export async function truncateChats(pool: Pool) {
  await pool.query(`TRUNCATE "chat" CASCADE;`);
}

export async function truncateMessages(pool: Pool) {
  await pool.query(`TRUNCATE "message" CASCADE;`);
}

export async function truncateDocuments(pool: Pool) {
  await pool.query(`TRUNCATE "document" CASCADE;`);
}

export async function truncateDocumentChunks(pool: Pool) {
  await pool.query(`TRUNCATE "document_chunk" CASCADE;`);
}
