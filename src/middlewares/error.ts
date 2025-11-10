import { ErrorRequestHandler } from "express";
import { errorResponse } from "../models/responses/response";
import { ApplicationError } from "../utils/errors";

export const errorMiddleware: ErrorRequestHandler = (error, req, res, next) => {
  // console.error("ERROR: ", error);

  const applicationError =
    error instanceof ApplicationError
      ? error
      : ApplicationError.internalServerError();

  const response = errorResponse(applicationError);

  res.status(applicationError.getStatusCode()).json(response);
};
