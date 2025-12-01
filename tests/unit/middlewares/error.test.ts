import { Request, Response } from "express";
import { errorMiddleware } from "../../../src/middlewares/error";
import { IServiceProvider } from "../../../src/service-provider";
import { ILogger } from "../../../src/services/logger";
import {
  ApplicationError,
  ApplicationErrorCode,
  HttpStatusCode,
} from "../../../src/utils/errors";

describe("errorMiddleware", () => {
  let services: jest.Mocked<IServiceProvider>;
  let logger: jest.Mocked<ILogger>;
  let request: jest.Mocked<Request>;
  let response: jest.Mocked<Response>;

  beforeEach(() => {
    services = { get: jest.fn() };

    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    services.get.mockReturnValue(logger);

    request = {} as unknown as jest.Mocked<Request>;

    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as jest.Mocked<Response>;
  });

  it("should map normal error to application internal server error and send error response with it", async () => {
    request.headers = {};
    request.cookies = {};

    const handler = errorMiddleware(services);

    await handler(
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

    const handler = errorMiddleware(services);

    await handler(
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
