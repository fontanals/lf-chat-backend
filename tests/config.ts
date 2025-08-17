import z from "zod";
import dotenv from "dotenv";

dotenv.config();

export const testConfig = z
  .object({
    TEST_POSTGRES_HOST: z.string(),
    TEST_POSTGRES_PORT: z.string(),
    TEST_POSTGRES_USER: z.string(),
    TEST_POSTGRES_PASSWORD: z.string(),
    TEST_POSTGRES_DB: z.string(),
  })
  .parse(process.env);
