import cookieParser from "cookie-parser";
import cors from "cors";
import { Express, json } from "express";
import { Server } from "node:http";
import { Pool } from "pg";
import { config } from "./config";
import { createAuthRoutes } from "./routes/auth";
import { createChatRoutes } from "./routes/chat";
import { createUserRoutes } from "./routes/user";
import { registerServices, ServiceContainer } from "./service-provider";
import { NumberUtils } from "./utils/numbers";
import { authMiddleware } from "./middlewares/auth";

export class Application {
  private readonly server: Server;
  private readonly pool: Pool;
  readonly serviceContainer = new ServiceContainer();

  constructor(expressApp: Express, pool: Pool) {
    this.pool = pool;

    registerServices(this.serviceContainer, pool);

    expressApp.use(
      cors({ origin: "http://localhost:5173", credentials: true })
    );
    expressApp.use(cookieParser());
    expressApp.use(json());

    this.setupRoutes(expressApp);

    this.server = expressApp.listen(
      NumberUtils.safeParseInt(config.PORT, 3000),
      "0.0.0.0",
      () => {
        console.log(`Server running on http://localhost:${config.PORT}/api`);
      }
    );
  }

  async end() {
    await this.pool.end();

    await new Promise((resolve) => {
      this.server.close((error) => {
        if (error != null) {
          return process.exit(1);
        }

        resolve(true);
      });
    });
  }

  private setupRoutes(expressApp: Express) {
    expressApp.get("/api", (_, res) => {
      res.json({ message: "Welcome to the AI Chat API.", version: "1.0.0" });
    });

    expressApp.use("/api", createAuthRoutes(this.serviceContainer));
    expressApp.use(
      "/api/user",
      authMiddleware(this.serviceContainer),
      createUserRoutes(this.serviceContainer)
    );
    expressApp.use(
      "/api/chats",
      authMiddleware(this.serviceContainer),
      createChatRoutes(this.serviceContainer)
    );
  }
}
