import { schedule } from "node-cron";
import { DataContext } from "../data/data-context";
import { pool } from "../data/pool";
import { FileStorage } from "../files/file-storage";
import { Logger } from "../services/logger";
import { ArrayUtils } from "../utils/arrays";

async function getDocuments(dataContext: DataContext, limit: number) {
  const result = await dataContext.query<{ id: string; key: string }>(
    `SELECT id, key FROM "document" LIMIT $1;`,
    [limit]
  );

  return result.rows;
}

async function main() {
  const logger = new Logger();
  const fileStorage = new FileStorage();

  schedule(
    "0 0 * * *",
    async () => {
      const dataContext = new DataContext(pool);

      try {
        let documents = await getDocuments(dataContext, 100);

        while (!ArrayUtils.isNullOrEmpty(documents)) {
          await fileStorage.deleteFiles(
            documents.map((document) => document.key)
          );

          await dataContext.execute(
            `DELETE FROM "document" WHERE id = ANY($1);`,
            [documents.map((document) => document.id)]
          );

          documents = await getDocuments(dataContext, 100);
        }

        await dataContext.execute(`TRUNCATE "session" CASCADE;`);

        await dataContext.execute(`TRUNCATE "project" CASCADE;`);

        await dataContext.execute(`TRUNCATE "chat" CASCADE;`);

        logger.info("Clear data job ran successfully.");
      } catch (error) {
        logger.error("Error running clear data job: ", error);
      }
    },
    { timezone: "UTC" }
  );

  logger.info("Clear data job scheduled for everyday at midnight (UTC).");
}

main();
