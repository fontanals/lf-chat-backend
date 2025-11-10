export enum ApplicationErrorCode {
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
  InvalidEmailOrPassword = 1000,
  MaxUsersReached = 1001,
  MaxUserDocumentsReached = 1002,
}

export class ApplicationError extends Error {
  code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.code = code;
  }

  getStatusCode() {
    switch (this.code) {
      case ApplicationErrorCode.InvalidEmailOrPassword:
        return ApplicationErrorCode.BadRequest;
      case ApplicationErrorCode.MaxUsersReached:
      case ApplicationErrorCode.MaxUserDocumentsReached:
        return ApplicationErrorCode.InternalServerError;
      default:
        return this.code;
    }
  }

  static badRequest(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.BadRequest,
      "Bad request."
    );
  }

  static unauthorized(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.Unauthorized,
      "Unauthorized."
    );
  }

  static notFound(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.NotFound,
      "Resource not found."
    );
  }

  static internalServerError(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.InternalServerError,
      "Internal server error."
    );
  }

  static invalidEmailOrPassword(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.InvalidEmailOrPassword,
      "Invalid email or password."
    );
  }

  static maxUsersReached(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.MaxUsersReached,
      "Maximum number of users reached."
    );
  }

  static maxUserDocumentsReached(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.MaxUserDocumentsReached,
      "Maximum number of documents for the user reached."
    );
  }
}
