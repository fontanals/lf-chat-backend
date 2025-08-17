import { NumberUtils } from "../../../src/utils/numbers";

describe("NumberUtils", () => {
  describe("safeParseInt", () => {
    it("should return valid integer when input value is parseable", () => {
      const result = NumberUtils.safeParseInt("123");

      expect(result).toBe(123);
    });

    it("should return fallback value when input value is not parseable", () => {
      const invalidStringResult = NumberUtils.safeParseInt("invalid", 837);
      const nullInputResult = NumberUtils.safeParseInt(null, 312);
      const undefinedInputResult = NumberUtils.safeParseInt(undefined, 431);

      expect(invalidStringResult).toBe(837);
      expect(nullInputResult).toBe(312);
      expect(undefinedInputResult).toBe(431);
    });
  });
});
