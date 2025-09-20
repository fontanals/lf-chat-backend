import { randomUUID } from "crypto";
import { Request, Response } from "express";
import z from "zod";
import {
  errorResponse,
  successResponse,
} from "../../../src/models/responses/response";
import { ServiceContainer } from "../../../src/service-provider";
import { ApplicationError, HttpStatusCode } from "../../../src/utils/errors";
import {
  getQueryDate,
  getQueryNumber,
  getQueryString,
  getQueryStringArray,
  jsonRequestHandler,
  sseRequestHandler,
  validateRequest,
} from "../../../src/utils/express";
import { ServerSentEvent } from "../../../src/utils/types";

describe("Express Utils", () => {
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
      header: jest.fn(),
      json: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<Response>;
  });

  describe("getQueryString", () => {
    it("should return undefined when value is null, undefined, or not a string", () => {
      expect(getQueryString(null)).toBeUndefined();
      expect(getQueryString(undefined)).toBeUndefined();
      expect(getQueryString({})).toBeUndefined();
      expect(getQueryString([])).toBeUndefined();
    });

    it("should return fallback value when value is null, undefined, or not a string", () => {
      expect(getQueryString(null, "fallback 1")).toBe("fallback 1");
      expect(getQueryString(undefined, "fallback 2")).toBe("fallback 2");
      expect(getQueryString({}, "fallback 3")).toBe("fallback 3");
      expect(getQueryString([], "fallback 4")).toBe("fallback 4");
    });

    it("should return the string value when value is a string", () => {
      expect(getQueryString("test 1")).toBe("test 1");
      expect(getQueryString("test 2", "fallback")).toBe("test 2");
    });
  });

  describe("getQueryNumber", () => {
    it("should return undefined when value is null, undefined, or not parseable", () => {
      expect(getQueryNumber(null)).toBeUndefined();
      expect(getQueryNumber(undefined)).toBeUndefined();
      expect(getQueryNumber({})).toBeUndefined();
      expect(getQueryNumber([])).toBeUndefined();
    });

    it("should return fallback value when value is null, undefined, or not parseable", () => {
      expect(getQueryNumber(null, 1)).toBe(1);
      expect(getQueryNumber(undefined, 2)).toBe(2);
      expect(getQueryNumber({}, 3)).toBe(3);
      expect(getQueryNumber([], 4)).toBe(4);
    });

    it("should return the number when value is parseable", () => {
      expect(getQueryNumber("5")).toBe(5);
      expect(getQueryNumber("6", 3)).toBe(6);
    });
  });

  describe("getQueryDate", () => {
    it("should return undefined when value is null, undefined, or not parseable", () => {
      expect(getQueryDate(null)).toBeUndefined();
      expect(getQueryDate(undefined)).toBeUndefined();
      expect(getQueryDate({})).toBeUndefined();
      expect(getQueryDate([])).toBeUndefined();
    });

    it("should return fallback value when value is null, undefined, or not parseable", () => {
      expect(getQueryDate(null, new Date("2020-01-01"))).toEqual(
        new Date("2020-01-01")
      );
      expect(getQueryDate(undefined, new Date("2020-01-02"))).toEqual(
        new Date("2020-01-02")
      );
      expect(getQueryDate({}, new Date("2020-01-03"))).toEqual(
        new Date("2020-01-03")
      );
      expect(getQueryDate([], new Date("2020-01-04"))).toEqual(
        new Date("2020-01-04")
      );
    });

    it("should return the date when value is parseable", () => {
      expect(getQueryDate("2020-01-01")).toEqual(new Date("2020-01-01"));
      expect(getQueryDate("2020-01-02", new Date("2020-01-03"))).toEqual(
        new Date("2020-01-02")
      );
    });
  });

  describe("getQueryStringArray", () => {
    it("should return undefined when value is null, undefined, or not parseable", () => {
      expect(getQueryStringArray(null)).toBeUndefined();
      expect(getQueryStringArray(undefined)).toBeUndefined();
      expect(getQueryStringArray({})).toBeUndefined();
    });

    it("should return fallback value when value is null, undefined, or not parseable", () => {
      expect(getQueryStringArray(null, ["a"])).toEqual(["a"]);
      expect(getQueryStringArray(undefined, ["b"])).toEqual(["b"]);
      expect(getQueryStringArray({}, ["c"])).toEqual(["c"]);
    });

    it("should return the array when value is parseable", () => {
      expect(getQueryStringArray("a")).toEqual(["a"]);
      expect(getQueryStringArray(["a", "b"])).toEqual(["a", "b"]);
      expect(getQueryStringArray(["a", "b", "c"], ["a"])).toEqual([
        "a",
        "b",
        "c",
      ]);
    });
  });

  describe("validateRequest", () => {
    it("should throw a bad request error when request does not match schema", () => {
      expect(() =>
        validateRequest(
          { firstName: "name" },
          z.object({
            firstName: z.string(),
            lastName: z.string(),
            age: z.number(),
          })
        )
      ).toThrow(ApplicationError.badRequest());
    });

    it("should not throw when request matches schema", () => {
      expect(() =>
        validateRequest(
          { firstName: "name", lastName: "name", age: 30 },
          z.object({
            firstName: z.string(),
            lastName: z.string(),
            age: z.number(),
          })
        )
      ).not.toThrow();
    });
  });

  describe("jsonRequestHandler", () => {
    it("should return a JSON request handler that sends an internal server error response", async () => {
      const handler = jsonRequestHandler(serviceContainer, async () => {
        throw new Error("Unexpected error.");
      });

      await handler(request, response, () => {});

      expect(response.header).toHaveBeenCalledWith(
        "Content-Type",
        "application/json; charset=utf-8"
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

      expect(response.header).toHaveBeenCalledWith(
        "Content-Type",
        "application/json; charset=utf-8"
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

      expect(response.header).toHaveBeenCalledWith(
        "Content-Type",
        "application/json; charset=utf-8"
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

      expect(response.header).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream; charset=utf-8"
      );
      expect(response.header).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(response.header).toHaveBeenCalledWith("Connection", "keep-alive");
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

      expect(response.header).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream; charset=utf-8"
      );
      expect(response.header).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(response.header).toHaveBeenCalledWith("Connection", "keep-alive");
      expect(response.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(errorEvent)}\n\n`
      );
      expect(response.end).toHaveBeenCalled();
    });

    it("should return an SSE request handler that sends events correctly", async () => {
      const messageId = randomUUID();
      const startEvent: ServerSentEvent<"start", { messageId: string }> = {
        event: "start",
        data: { messageId },
        isDone: false,
      };
      const firstDeltaEvent: ServerSentEvent<
        "delta",
        { messageId: string; delta: string }
      > = {
        event: "delta",
        data: { messageId, delta: "Hello" },
        isDone: false,
      };
      const secondDeltaEvent: ServerSentEvent<
        "delta",
        { messageId: string; delta: string }
      > = {
        event: "delta",
        data: { messageId, delta: "there!" },
        isDone: false,
      };
      const endEvent: ServerSentEvent<"end", { messageId: string }> = {
        event: "end",
        data: { messageId },
        isDone: false,
      };

      const handler = sseRequestHandler(serviceContainer, async (req, res) => {
        res.write(`data: ${JSON.stringify(startEvent)}\n\n`);
        res.write(`data: ${JSON.stringify(firstDeltaEvent)}\n\n`);
        res.write(`data: ${JSON.stringify(secondDeltaEvent)}\n\n`);
        res.write(`data: ${JSON.stringify(endEvent)}\n\n`);
      });

      await handler(request, response, () => {});

      expect(response.header).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream; charset=utf-8"
      );
      expect(response.header).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(response.header).toHaveBeenCalledWith("Connection", "keep-alive");
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
