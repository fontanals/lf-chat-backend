import cookieParser from "cookie-parser";
import cors from "cors";
import { Express, json } from "express";
import { Server } from "node:http";
import { Pool } from "pg";
import { config } from "./config";
import { authMiddleware } from "./middlewares/auth";
import { signin, signup } from "./routes/auth";
import {
  createChat,
  deleteChat,
  getChatMessages,
  getChats,
  sendMessage,
  updateChat,
} from "./routes/chat";
import { registerServices, ServiceContainer } from "./service-provider";
import { NumberUtils } from "./utils/numbers";
import { jsonRequestHandler, sseRequestHandler } from "./utils/express";

export class Application {
  private readonly server: Server;
  private readonly pool: Pool;
  public readonly services = new ServiceContainer();

  constructor(expressApp: Express, pool: Pool) {
    this.pool = pool;

    registerServices(this.services, pool);

    expressApp.use(cors());
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

    expressApp.post("/api/signup", jsonRequestHandler(this.services, signup));
    expressApp.post("/api/signin", jsonRequestHandler(this.services, signin));
    expressApp.get(
      "/api/chats",
      authMiddleware(this.services),
      jsonRequestHandler(this.services, getChats)
    );
    expressApp.get(
      "/api/chats/:chatId/messages",
      authMiddleware(this.services),
      jsonRequestHandler(this.services, getChatMessages)
    );
    expressApp.post(
      "/api/chats",
      authMiddleware(this.services),
      sseRequestHandler(this.services, createChat)
    );
    expressApp.post(
      "/api/chats/:chatId/messages",
      authMiddleware(this.services),
      sseRequestHandler(this.services, sendMessage)
    );
    expressApp.patch(
      "/api/chats/:chatId",
      authMiddleware(this.services),
      jsonRequestHandler(this.services, updateChat)
    );
    expressApp.delete(
      "/api/chats/:chatId",
      authMiddleware(this.services),
      jsonRequestHandler(this.services, deleteChat)
    );
  }
}
