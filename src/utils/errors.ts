export enum HttpStatusCode {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

export enum ApplicationErrorCode {
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
  InvalidEmailOrPassword = 10000,
  UserMessageViolatesContentPolicy = 10001,
}

export class ApplicationError extends Error {
  statusCode: HttpStatusCode;
  code: ApplicationErrorCode;

  constructor(
    statusCode: HttpStatusCode,
    code: ApplicationErrorCode,
    message: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(): ApplicationError {
    return new ApplicationError(
      HttpStatusCode.BadRequest,
      ApplicationErrorCode.BadRequest,
      "Bad request."
    );
  }

  static unauthorized(): ApplicationError {
    return new ApplicationError(
      HttpStatusCode.Unauthorized,
      ApplicationErrorCode.Unauthorized,
      "Unauthorized."
    );
  }

  static notFound(): ApplicationError {
    return new ApplicationError(
      HttpStatusCode.NotFound,
      ApplicationErrorCode.NotFound,
      "Resource not found."
    );
  }

  static internalServerError(): ApplicationError {
    return new ApplicationError(
      HttpStatusCode.InternalServerError,
      ApplicationErrorCode.InternalServerError,
      "Internal server error."
    );
  }

  static invalidEmailOrPassword(): ApplicationError {
    return new ApplicationError(
      HttpStatusCode.BadRequest,
      ApplicationErrorCode.InvalidEmailOrPassword,
      "Invalid email or password."
    );
  }

  static userMessageViolatesContentPolicy(): ApplicationError {
    return new ApplicationError(
      HttpStatusCode.BadRequest,
      ApplicationErrorCode.UserMessageViolatesContentPolicy,
      "User message violates content policy."
    );
  }
}
