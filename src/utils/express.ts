import { isValid } from "date-fns";
import { Request, RequestHandler, Response } from "express";
import { ZodType } from "zod";
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

export function getQueryDate(value: any): Date | undefined;
export function getQueryDate(value: any, fallbackValue: Date): Date;

export function getQueryDate(value: any, fallbackValue?: Date) {
  if (value == null || typeof value !== "string") {
    return fallbackValue;
  }

  const parsedValue = new Date(value);

  return isValid(parsedValue) ? parsedValue : fallbackValue;
}

export function getQueryStringArray(value: any): string[] | undefined;
export function getQueryStringArray(
  value: any,
  fallbackValue: string[]
): string[];

export function getQueryStringArray(value: any, fallbackValue?: string[]) {
  if (value == null) {
    return fallbackValue;
  }

  if (typeof value === "string") {
    return [value];
  }

  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallbackValue;
}

export function validateRequest(request: Record<string, any>, schema: ZodType) {
  const result = schema.safeParse(request);

  if (!result.success) {
    throw ApplicationError.badRequest();
  }
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
    res.header("Content-Type", "application/json; charset=utf-8");
    res.header("Access-Control-Expose-Headers", "Authorization");

    try {
      const scope = serviceContainer.createScope();

      const result = await handler(req, res, scope);

      const response = successResponse(result);

      res.json(response);
    } catch (error) {
      console.error("ERROR: ", error);

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
    res.header("Content-Type", "text/event-stream; charset=utf-8");
    res.header("Cache-Control", "no-cache");
    res.header("Connection", "keep-alive");
    res.header("Access-Control-Expose-Headers", "Authorization");

    try {
      const scope = serviceContainer.createScope();

      await handler(req, res, scope);
    } catch (error) {
      console.error("ERROR: ", error);

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
