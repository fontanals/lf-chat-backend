import { Request, Response } from "express";
import { errorMiddleware } from "../../../src/middlewares/error";
import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";
import { HttpStatusCode } from "../../../src/utils/types";

describe("errorMiddleware", () => {
  let request: jest.Mocked<Request>;
  let response: jest.Mocked<Response>;

  beforeEach(() => {
    request = {} as unknown as jest.Mocked<Request>;

    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as jest.Mocked<Response>;
  });

  it("should map normal error to application internal server error and send error response with it", async () => {
    request.headers = {};
    request.cookies = {};

    await errorMiddleware(
      new Error("Something went wrong."),
      request,
      response,
      jest.fn()
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatusCode.InternalServerError
    );
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        code: ApplicationErrorCode.InternalServerError,
      }),
    });
  });

  it("should send error response with received application error", async () => {
    request.headers = {};
    request.cookies = {};

    await errorMiddleware(
      ApplicationError.unauthorized(),
      request,
      response,
      jest.fn()
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatusCode.Unauthorized);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        code: ApplicationErrorCode.Unauthorized,
      }),
    });
  });
});
