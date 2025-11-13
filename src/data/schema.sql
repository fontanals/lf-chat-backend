CREATE EXTENSION IF NOT EXISTS vector;

CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "user" (
    "id" uuid PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "display_name" text NOT NULL,
    "custom_prompt" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER set_user_updated_at
BEFORE UPDATE ON "user"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "session" (
    "id" uuid PRIMARY KEY,
    "expires_at" timestamp with time zone NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "refresh_token" (
    "id" uuid PRIMARY KEY,
    "token" text NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "is_revoked" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "session_id" uuid NOT NULL REFERENCES "session"("id") ON DELETE CASCADE
);

CREATE TRIGGER set_refresh_token_updated_at
BEFORE UPDATE
ON "refresh_token"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "project" (
    "id" uuid PRIMARY KEY,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TRIGGER set_project_updated_at
BEFORE UPDATE ON "project"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "chat" (
    "id" uuid PRIMARY KEY,
    "title" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TRIGGER set_chat_updated_at
BEFORE UPDATE ON "chat"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TYPE "message_role" AS ENUM ('user', 'assistant');
CREATE TYPE "message_feedback" AS ENUM ('like', 'dislike', 'neutral');
CREATE TYPE "message_finish_reason" AS ENUM ('stop', 'length', 'content-filter', 'tool-calls', 'error', 'other', 'unknown', 'interrupted');

CREATE TABLE "message" (
    "id" uuid PRIMARY KEY,
    "role" message_role NOT NULL,
    "content" jsonb NOT NULL,
    "feedback" message_feedback,
    "finish_reason" message_finish_reason,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "parent_message_id" uuid REFERENCES "message"("id") ON DELETE CASCADE,
    "chat_id" uuid NOT NULL REFERENCES "chat"("id") ON DELETE CASCADE
);

CREATE TRIGGER set_message_updated_at
BEFORE UPDATE ON "message"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "document" (
    "id" uuid PRIMARY KEY,
    "key" text NOT NULL UNIQUE,
    "name" text NOT NULL,
    "mimetype" text NOT NULL,
    "size_in_bytes" integer NOT NULL,
    "is_processed" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "chat_id" uuid REFERENCES "chat"("id") ON DELETE CASCADE,
    "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TRIGGER set_document_updated_at
BEFORE UPDATE ON "document"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "document_chunk" (
    "id" uuid PRIMARY KEY,
    "index" integer NOT NULL,
    "content" text NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "document_id" uuid NOT NULL REFERENCES "document"("id") ON DELETE CASCADE
);

CREATE TABLE "open_ai_model_usage" (
    "model" text PRIMARY KEY,
    "input_tokens" integer NOT NULL,
    "output_tokens" integer NOT NULL,
    "total_tokens" integer NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER set_open_ai_model_usage_updated_at
BEFORE UPDATE ON "open_ai_model_usage"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO "user"
(id, name, email, password, display_name, custom_prompt)
VALUES
(gen_random_uuid(), 'Demo User', 'demo@lfchat.com', '$2b$10$NOARcGh.tPYQTLgSi23kjuiHJNHFxC7diXdMt2JT0rcyX4Pctt3L2', 'Demo', '');

INSERT INTO "open_ai_model_usage"
(model, input_tokens, output_tokens, total_tokens)
VALUES
('gpt-5-nano', 0, 0, 0),
('gpt-4o-mini', 0, 0, 0),
('text-embedding-3-small', 0, 0, 0);
