import { Request, RequestHandler, Response } from "express";
import { errorResponse, successResponse } from "../models/responses/response";
import { IServiceProvider, ServiceContainer } from "../service-provider";
import { ApplicationError } from "./errors";
import { ServerSentEvent } from "./types";

export function getQueryString(value: any): string | undefined;
export function getQueryString(value: any, fallbackValue: string): string;

export function getQueryString(value: any, fallbackValue?: string) {
  return value != null && typeof value === "string" ? value : fallbackValue;
}

export function getQueryNumber(value: any): number | undefined;
export function getQueryNumber(value: any, fallbackValue: number): number;

export function getQueryNumber(value: any, fallbackValue?: number) {
  if (value == null || typeof value !== "string") {
    return fallbackValue;
  }
  const parsedValue = parseInt(value);
  return !isNaN(parsedValue) ? parsedValue : fallbackValue;
}

export function jsonRequestHandler(
  serviceContainer: ServiceContainer,
  handler: (
    req: Request,
    res: Response,
    services: IServiceProvider
  ) => Promise<any>
): RequestHandler {
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    try {
      const scope = serviceContainer.createScope();

      const result = await handler(req, res, scope);

      const response = successResponse(result);

      res.json(response);
    } catch (error) {
      const applicationError =
        error instanceof ApplicationError
          ? error
          : ApplicationError.internalServerError();

      const response = errorResponse(applicationError);

      res.status(applicationError.statusCode).json(response);
    }
  };
}

export function sseRequestHandler(
  serviceContainer: ServiceContainer,
  handler: (
    req: Request,
    res: Response,
    services: IServiceProvider
  ) => Promise<void>
): RequestHandler {
  return async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const scope = serviceContainer.createScope();

      await handler(req, res, scope);
    } catch (error) {
      const appliationError =
        error instanceof ApplicationError
          ? error
          : ApplicationError.internalServerError();

      const event: ServerSentEvent<"error", ApplicationError> = {
        event: "error",
        data: appliationError,
        isDone: true,
      };

      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } finally {
      res.end();
    }
  };
}
