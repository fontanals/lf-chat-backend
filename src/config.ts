import dotenv from "dotenv";
import z from "zod";

dotenv.config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });

export const config = z
  .object({
    PORT: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "POSTGRES_PORT must be a valid integer",
      }),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    ACCESS_TOKEN_SECRET: z.string(),
    REFRESH_TOKEN_SECRET: z.string(),
    AWS_REGION: z.string(),
    AWS_S3_BUCKET_NAME: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
    OPENAI_MAIN_MODEL: z.enum(["gpt-5-nano", "gpt-4o-mini"]),
    OPENAI_LOW_MODEL: z.enum(["gpt-5-nano", "gpt-4o-mini"]),
    OPENAI_MONTHLY_USAGE_LIMIT_IN_DOLLARS: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message:
          "OPENAI_MONTHLY_USAGE_LIMIT_IN_DOLLARS must be a valid integer",
      }),
    CHUNK_SIZE: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "CHUNK_SIZE must be a valid integer",
      }),
    CHUNK_OVERLAP: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "CHUNK_OVERLAP must be a valid integer",
      }),
    ENABLE_RATE_LIMITING: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    DEFAULT_RATE_LIMIT_WINDOW_IN_MINUTES: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "DEFAULT_RATE_LIMIT_WINDOW_IN_MINUTES must be a valid integer",
      }),
    DEFAULT_RATE_LIMIT_MAX_REQUESTS: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "DEFAULT_RATE_LIMIT_MAX_REQUESTS must be a valid integer",
      }),
    SIGNUP_RATE_LIMIT_WINDOW_IN_MINUTES: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "SIGNUP_RATE_LIMIT_WINDOW_IN_MINUTES must be a valid integer",
      }),
    SIGNUP_RATE_LIMIT_MAX_REQUESTS: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "SIGNUP_RATE_LIMIT_MAX_REQUESTS must be a valid integer",
      }),
    MAX_USERS: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "MAX_USERS must be a valid integer",
      }),
    MAX_DOCUMENTS_PER_USER: z
      .string()
      .transform((value) => parseInt(value))
      .refine((value) => !isNaN(value), {
        message: "MAX_DOCUMENTS_PER_USER must be a valid integer",
      }),
  })
  .parse(process.env);
