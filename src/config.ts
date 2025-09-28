import z from "zod";
import dotenv from "dotenv";

dotenv.config();

export const config = z
  .object({
    PORT: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val), {
        message: "POSTGRES_PORT must be a valid integer",
      }),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    ACCESS_TOKEN_SECRET: z.string(),
    REFRESH_TOKEN_SECRET: z.string(),
    OPENAI_API_KEY: z.string(),
    OPENAI_MODEL: z.string(),
    UPLOADS_PATH: z.string(),
    CHUNK_SIZE: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val), {
        message: "CHUNK_SIZE must be a valid integer",
      }),
    CHUNK_OVERLAP: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val), {
        message: "CHUNK_OVERLAP must be a valid integer",
      }),
  })
  .parse(process.env);
