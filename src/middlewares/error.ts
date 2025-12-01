import { ErrorRequestHandler } from "express";
import { errorResponse } from "../models/responses/response";
import { IServiceProvider } from "../service-provider";
import { ApplicationError } from "../utils/errors";

export function errorMiddleware(
  servives: IServiceProvider
): ErrorRequestHandler {
  return (error, req, res, next) => {
    const logger = servives.get("Logger");

    logger.error("API Error: ", error, { method: req.method, url: req.url });

    const applicationError =
      error instanceof ApplicationError
        ? error
        : ApplicationError.internalServerError();

    const response = errorResponse(applicationError);

    res.status(applicationError.getStatusCode()).json(response);
  };
}
