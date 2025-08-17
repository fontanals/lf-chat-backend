import { Request, Response } from "express";
import {
  errorResponse,
  successResponse,
} from "../../../src/models/responses/response";
import { ServiceContainer } from "../../../src/service-provider";
import { ApplicationError, HttpStatusCode } from "../../../src/utils/errors";
import {
  jsonRequestHandler,
  sseRequestHandler,
} from "../../../src/utils/express";
import { ServerSentEvent } from "../../../src/utils/types";

describe("Request Handlers", () => {
  let serviceContainer: jest.Mocked<ServiceContainer>;
  let request: jest.Mocked<Request>;
  let response: jest.Mocked<Response>;

  beforeEach(() => {
    serviceContainer = {
      createScope: jest.fn(),
    } as unknown as jest.Mocked<ServiceContainer>;

    request = {} as unknown as jest.Mocked<Request>;

    response = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      json: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<Response>;
  });

  describe("jsonRequestHandler", () => {
    it("should return a JSON request handler that sends an internal server error response", async () => {
      const handler = jsonRequestHandler(serviceContainer, async () => {
        throw new Error("Unexpected error.");
      });

      await handler(request, response, () => {});

      expect(response.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json; charset=utf-8"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(response.status).toHaveBeenCalledWith(
        HttpStatusCode.InternalServerError
      );
      expect(response.json).toHaveBeenCalledWith(
        errorResponse(ApplicationError.internalServerError())
      );
    });

    it("should return a JSON request handler that sends a bad request error response", async () => {
      const handler = jsonRequestHandler(serviceContainer, async () => {
        throw ApplicationError.badRequest();
      });

      await handler(request, response, () => {});

      expect(response.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json; charset=utf-8"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(response.status).toHaveBeenCalledWith(HttpStatusCode.BadRequest);
      expect(response.json).toHaveBeenCalledWith(
        errorResponse(ApplicationError.badRequest())
      );
    });

    it("should return a JSON request handler that sends a success response", async () => {
      const handlerResponse = { message: "Success" };

      const handler = jsonRequestHandler(
        serviceContainer,
        async () => handlerResponse
      );

      await handler(request, response, () => {});

      expect(response.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json; charset=utf-8"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(response.json).toHaveBeenCalledWith(
        successResponse(handlerResponse)
      );
    });
  });

  describe("sseRequestHandler", () => {
    it("should return an SSE request handler that sends an internal server error event", async () => {
      const errorEvent: ServerSentEvent<"error", ApplicationError> = {
        event: "error",
        data: ApplicationError.internalServerError(),
        isDone: true,
      };

      const handler = sseRequestHandler(serviceContainer, async () => {
        throw new Error("Unexpected error.");
      });

      await handler(request, response, () => {});

      expect(response.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream; charset=utf-8"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Connection",
        "keep-alive"
      );
      expect(response.status).toHaveBeenCalledWith(
        HttpStatusCode.InternalServerError
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(errorEvent)}\n\n`
      );
      expect(response.end).toHaveBeenCalled();
    });

    it("should return an SSE request handler that sends a bad request error event", async () => {
      const errorEvent: ServerSentEvent<"error", ApplicationError> = {
        event: "error",
        data: ApplicationError.badRequest(),
        isDone: true,
      };

      const handler = sseRequestHandler(serviceContainer, async () => {
        throw ApplicationError.badRequest();
      });

      await handler(request, response, () => {});

      expect(response.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream; charset=utf-8"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Connection",
        "keep-alive"
      );
      expect(response.status).toHaveBeenCalledWith(HttpStatusCode.BadRequest);
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(errorEvent)}\n\n`
      );
      expect(response.end).toHaveBeenCalled();
    });

    it("should return an SSE request handler that sends events correctly", async () => {
      const startEvent: ServerSentEvent<"start", { messageId: string }> = {
        event: "start",
        data: { messageId: "message-1" },
        isDone: false,
      };
      const firstDeltaEvent: ServerSentEvent<
        "delta",
        { messageId: string; delta: string }
      > = {
        event: "delta",
        data: { messageId: "message-id", delta: "Hello" },
        isDone: false,
      };
      const secondDeltaEvent: ServerSentEvent<
        "delta",
        { messageId: string; delta: string }
      > = {
        event: "delta",
        data: { messageId: "message-id", delta: "there!" },
        isDone: false,
      };
      const endEvent: ServerSentEvent<"end", { messageId: string }> = {
        event: "end",
        data: { messageId: "message-id" },
        isDone: false,
      };

      const handler = sseRequestHandler(serviceContainer, async (req, res) => {
        res.write(`data: ${JSON.stringify(startEvent)}\n\n`);
        res.write(`data: ${JSON.stringify(firstDeltaEvent)}\n\n`);
        res.write(`data: ${JSON.stringify(secondDeltaEvent)}\n\n`);
        res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
      });

      await handler(request, response, () => {});

      expect(response.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream; charset=utf-8"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "Connection",
        "keep-alive"
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(startEvent)}\n\n`
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(firstDeltaEvent)}\n\n`
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(secondDeltaEvent)}\n\n`
      );
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(endEvent)}\n\n`
      );
      expect(response.end).toHaveBeenCalled();
    });
  });
});
