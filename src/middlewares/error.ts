import { ErrorRequestHandler } from "express";
import { errorResponse } from "../models/responses/response";
import { ApplicationError } from "../utils/errors";
import { IServiceProvider } from "../service-provider";

export function errorMiddleware(
  servives: IServiceProvider
): ErrorRequestHandler {
  return (error, req, res, next) => {
    const logger = servives.get("Logger");

    logger.error("API Error", error, {
      method: req.method,
      url: req.url,
      authContext: req.authContext,
      params: req.params,
      query: req.query,
      body: req.body,
    });

    const applicationError =
      error instanceof ApplicationError
        ? error
        : ApplicationError.internalServerError();

    const response = errorResponse(applicationError);

    res.status(applicationError.getStatusCode()).json(response);
  };
}
