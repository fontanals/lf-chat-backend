import {
  ApplicationError,
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";

describe("ApplicationError", () => {
  it("should create a bad request error and return bad request http status code", () => {
    const error = ApplicationError.badRequest();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.BadRequest);
    expect(error.getStatusCode()).toBe(HttpStatusCode.BadRequest);
  });

  it("should create an unauthorized error and return unauthorized http status code", () => {
    const error = ApplicationError.unauthorized();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.Unauthorized);
    expect(error.getStatusCode()).toBe(HttpStatusCode.Unauthorized);
  });

  it("should create a not found error and return not found http status code", () => {
    const error = ApplicationError.notFound();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.NotFound);
    expect(error.getStatusCode()).toBe(HttpStatusCode.NotFound);
  });

  it("should create an internal server error and return internal server error http status code", () => {
    const error = ApplicationError.internalServerError();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.InternalServerError);
    expect(error.getStatusCode()).toBe(HttpStatusCode.InternalServerError);
  });

  it("should create an invalid account verification token error and return bad request http status code", () => {
    const error = ApplicationError.invalidAccountVerificationToken();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(
      ApplicationErrorCode.InvalidAccountVerificationToken
    );
    expect(error.getStatusCode()).toBe(HttpStatusCode.BadRequest);
  });

  it("should create an invalid email or password error and return bad request http status code", () => {
    const error = ApplicationError.invalidEmailOrPassword();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.InvalidEmailOrPassword);
    expect(error.getStatusCode()).toBe(HttpStatusCode.BadRequest);
  });

  it("should create a session expired error and return unauthorized http status code", () => {
    const error = ApplicationError.sessionExpired();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.SessionExpired);
    expect(error.getStatusCode()).toBe(HttpStatusCode.Unauthorized);
  });

  it("should create an invalid password recovery token error and return bad request http status code", () => {
    const error = ApplicationError.invalidPasswordRecoveryToken();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.InvalidPasswordRecoveryToken);
    expect(error.getStatusCode()).toBe(HttpStatusCode.BadRequest);
  });

  it("should create a max user documents reached error and return conflict http status code", () => {
    const error = ApplicationError.maxUserDocumentsReached();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.MaxUserDocumentsReached);
    expect(error.getStatusCode()).toBe(HttpStatusCode.Conflict);
  });

  it("should create a content filter error and return bad request http status code", () => {
    const error = ApplicationError.contentFilter();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.ContentFilter);
    expect(error.getStatusCode()).toBe(HttpStatusCode.BadRequest);
  });
});
