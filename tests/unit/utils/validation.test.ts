import z from "zod";
import { ApplicationError } from "../../../src/utils/errors";
import { ValidationUtils } from "../../../src/utils/validation";

describe("ValidationUtils", () => {
  describe("validateRequest", () => {
    it("should throw a bad request error when request does not match schema", () => {
      expect(() =>
        ValidationUtils.validateRequest(
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
        ValidationUtils.validateRequest(
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
});
