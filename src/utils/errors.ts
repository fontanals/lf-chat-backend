export enum HttpStatusCode {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Conflict = 409,
  Gone = 410,
  InternalServerError = 500,
}

export enum ApplicationErrorCode {
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Gone = 410,
  InternalServerError = 500,
  InvalidAccountVerificationToken = 1000,
  InvalidEmailOrPassword = 1001,
  SessionExpired = 1002,
  InvalidPasswordRecoveryToken = 1003,
  MaxUserDocumentsReached = 1004,
  ContentFilter = 1005,
}

export class ApplicationError extends Error {
  code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.code = code;
  }

  getStatusCode() {
    switch (this.code) {
      case ApplicationErrorCode.SessionExpired:
        return HttpStatusCode.Unauthorized;
      case ApplicationErrorCode.InvalidAccountVerificationToken:
      case ApplicationErrorCode.InvalidEmailOrPassword:
      case ApplicationErrorCode.InvalidPasswordRecoveryToken:
      case ApplicationErrorCode.ContentFilter:
        return HttpStatusCode.BadRequest;
      case ApplicationErrorCode.MaxUserDocumentsReached:
        return HttpStatusCode.Conflict;
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

  static gone(): ApplicationError {
    return new ApplicationError(ApplicationErrorCode.Gone, "Resource gone.");
  }

  static internalServerError(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.InternalServerError,
      "Internal server error."
    );
  }

  static invalidAccountVerificationToken(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.InvalidAccountVerificationToken,
      "Invalid account verification token."
    );
  }

  static invalidEmailOrPassword(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.InvalidEmailOrPassword,
      "Invalid email or password."
    );
  }

  static sessionExpired(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.SessionExpired,
      "Session expired."
    );
  }

  static invalidPasswordRecoveryToken(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.InvalidPasswordRecoveryToken,
      "Invalid password recovery token."
    );
  }

  static maxUserDocumentsReached(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.MaxUserDocumentsReached,
      "Maximum number of user documents reached."
    );
  }

  static contentFilter(): ApplicationError {
    return new ApplicationError(
      ApplicationErrorCode.ContentFilter,
      "Content violates content policy."
    );
  }
}
