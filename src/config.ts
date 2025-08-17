import z from "zod";
import dotenv from "dotenv";

dotenv.config();

export const config = z
  .object({
    PORT: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    ACCESS_TOKEN_SECRET: z.string(),
    REFRESH_TOKEN_SECRET: z.string(),
    OPENAI_API_KEY: z.string(),
    OPENAI_MODEL: z.string(),
  })
  .parse(process.env);
