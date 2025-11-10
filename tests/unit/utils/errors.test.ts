import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";
import { HttpStatusCode } from "../../../src/utils/types";

describe("ApplicationError", () => {
  it("should create a bad request error and return correct http status code", () => {
    const error = ApplicationError.badRequest();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.BadRequest);
    expect(error.getStatusCode()).toBe(HttpStatusCode.BadRequest);
  });

  it("should create an unauthorized error and return correct http status code", () => {
    const error = ApplicationError.unauthorized();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.Unauthorized);
    expect(error.getStatusCode()).toBe(HttpStatusCode.Unauthorized);
  });

  it("should create a not found error and return correct http status code", () => {
    const error = ApplicationError.notFound();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.NotFound);
    expect(error.getStatusCode()).toBe(HttpStatusCode.NotFound);
  });

  it("should create an internal server error and return correct http status code", () => {
    const error = ApplicationError.internalServerError();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.InternalServerError);
    expect(error.getStatusCode()).toBe(HttpStatusCode.InternalServerError);
  });

  it("should create an invalid email or password error and return correct http status code", () => {
    const error = ApplicationError.invalidEmailOrPassword();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.InvalidEmailOrPassword);
    expect(error.getStatusCode()).toBe(HttpStatusCode.BadRequest);
  });

  it("should create a max users reached error and return correct http status code", () => {
    const error = ApplicationError.maxUsersReached();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.MaxUsersReached);
    expect(error.getStatusCode()).toBe(HttpStatusCode.InternalServerError);
  });

  it("should create a max user documents reached error and return correct http status code", () => {
    const error = ApplicationError.maxUserDocumentsReached();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(ApplicationErrorCode.MaxUserDocumentsReached);
    expect(error.getStatusCode()).toBe(HttpStatusCode.InternalServerError);
  });
});
