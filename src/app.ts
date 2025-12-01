import cookieParser from "cookie-parser";
import cors from "cors";
import { Express, json } from "express";
import rateLimit from "express-rate-limit";
import { Server } from "node:http";
import { Pool } from "pg";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { swaggerSpec } from "./docs/swagger";
import { authMiddleware } from "./middlewares/auth";
import { errorMiddleware } from "./middlewares/error";
import { createAuthRoutes } from "./routes/auth";
import { createChatRoutes } from "./routes/chats";
import { createDocumentRoutes } from "./routes/documents";
import { createProjectRoutes } from "./routes/projects";
import { createTestRoutes } from "./routes/test";
import { createUserRoutes } from "./routes/user";
import { registerServices, ServiceContainer } from "./service-provider";

export class Application {
  private readonly server: Server;
  private readonly pool: Pool;
  readonly serviceContainer = new ServiceContainer();

  constructor(expressApp: Express, pool: Pool) {
    this.pool = pool;

    registerServices(this.serviceContainer, pool);

    expressApp.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
    expressApp.use(cookieParser());
    expressApp.use(json());

    if (config.ENABLE_RATE_LIMITING) {
      expressApp.use(
        rateLimit({
          windowMs: config.RATE_LIMIT_WINDOW_IN_MINUTES * 60 * 1000,
          max: config.RATE_LIMIT_MAX_REQUESTS,
          standardHeaders: true,
          legacyHeaders: false,
        })
      );
    }

    this.setupRoutes(expressApp);

    expressApp.use(errorMiddleware(this.serviceContainer));

    this.server = expressApp.listen(config.PORT, "0.0.0.0", () => {
      const logger = this.serviceContainer.get("Logger");

      logger.info(`HTTP Server running at http://localhost:${config.PORT}/api`);
      logger.info(
        `Swagger docs available at http://localhost:${config.PORT}/api/docs`
      );
    });
  }

  async end() {
    await this.pool.end();

    const emailService = this.serviceContainer.get("EmailService");

    emailService.close();

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
      res.json({ title: "AI Chat API", version: "1.0.0" });
    });

    expressApp.use("/api", createAuthRoutes(this.serviceContainer));

    expressApp.use(
      "/api/user",
      authMiddleware(this.serviceContainer),
      createUserRoutes(this.serviceContainer)
    );

    expressApp.use(
      "/api/projects",
      authMiddleware(this.serviceContainer),
      createProjectRoutes(this.serviceContainer)
    );

    expressApp.use(
      "/api/chats",
      authMiddleware(this.serviceContainer),
      createChatRoutes(this.serviceContainer)
    );

    expressApp.use(
      "/api/documents",
      authMiddleware(this.serviceContainer),
      createDocumentRoutes(this.serviceContainer)
    );

    if (config.NODE_ENV === "test") {
      expressApp.use("/api/__test__", createTestRoutes(this.serviceContainer));
    }

    expressApp.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }
}
