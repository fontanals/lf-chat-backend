import {
  ApplicationError,
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";

describe("ApplicationError", () => {
  it("should create a bad request error", () => {
    const error = ApplicationError.badRequest();

    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).statusCode).toBe(
      HttpStatusCode.BadRequest
    );
    expect((error as ApplicationError).code).toBe(
      ApplicationErrorCode.BadRequest
    );
  });

  it("should create an unauthorized error", () => {
    const error = ApplicationError.unauthorized();

    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).statusCode).toBe(
      HttpStatusCode.Unauthorized
    );
    expect((error as ApplicationError).code).toBe(
      ApplicationErrorCode.Unauthorized
    );
  });

  it("should create a not found error", () => {
    const error = ApplicationError.notFound();

    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).statusCode).toBe(
      HttpStatusCode.NotFound
    );
    expect((error as ApplicationError).code).toBe(
      ApplicationErrorCode.NotFound
    );
  });

  it("should create an internal server error", () => {
    const error = ApplicationError.internalServerError();

    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).statusCode).toBe(
      HttpStatusCode.InternalServerError
    );
    expect((error as ApplicationError).code).toBe(
      ApplicationErrorCode.InternalServerError
    );
  });

  it("should create an invalid email or password error", () => {
    const error = ApplicationError.invalidEmailOrPassword();

    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).statusCode).toBe(
      HttpStatusCode.BadRequest
    );
    expect((error as ApplicationError).code).toBe(
      ApplicationErrorCode.InvalidEmailOrPassword
    );
  });

  it("should create a user message violates content policy error", () => {
    const error = ApplicationError.userMessageViolatesContentPolicy();

    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).statusCode).toBe(
      HttpStatusCode.BadRequest
    );
    expect((error as ApplicationError).code).toBe(
      ApplicationErrorCode.UserMessageViolatesContentPolicy
    );
  });
});
