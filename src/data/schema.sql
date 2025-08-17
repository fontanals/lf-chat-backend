CREATE TABLE "user" (
    "id" uuid PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "session" (
    "id" uuid PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "refresh_token" (
    "id" uuid PRIMARY KEY,
    "token" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "is_revoked" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" uuid NOT NULL REFERENCES "session"("id") ON DELETE CASCADE
);

CREATE TABLE "chat" (
    "id" uuid PRIMARY KEY,
    "title" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

CREATE TABLE "message" (
    "id" uuid PRIMARY KEY,
    "role" message_role NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chat_id" uuid NOT NULL REFERENCES "chat"("id") ON DELETE CASCADE
);
