import fs from "fs";
import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import "winston-daily-rotate-file";
import { config } from "../config";

export interface ILogger {
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: string, ...meta: any[]): void;
}

export class Logger {
  private readonly logger: WinstonLogger;

  constructor() {
    if (!fs.existsSync(config.LOGS_PATH)) {
      fs.mkdirSync(config.LOGS_PATH, { recursive: true });
    }

    this.logger = createLogger({
      level: "info",
      format: format.combine(
        format.timestamp(),
        format.printf(
          (info) =>
            `${info.timestamp} [${info.level}]: ${info.message}${
              info.meta != null ? ` ${JSON.stringify(info.meta)}` : ""
            }`
        )
      ),
      defaultMeta: { service: "user-service" },
      transports: [
        new transports.Console({ level: "debug" }),
        new transports.DailyRotateFile({
          level: "info",
          filename: `${config.LOGS_PATH}/ai-chat-%DATE%.log`,
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "5m",
          maxFiles: "5d",
        }),
      ],
    });
  }

  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  error(message: string, ...meta: any[]): void {
    this.logger.error(message, ...meta);
  }
}
