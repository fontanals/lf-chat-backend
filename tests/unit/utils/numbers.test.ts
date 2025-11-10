import { NumberUtils } from "../../../src/utils/numbers";

describe("NumberUtils", () => {
  describe("safeParseInt", () => {
    it("should return fallback value when input value is not parseable", () => {
      expect(NumberUtils.safeParseInt("invalid", 837)).toBe(837);
      expect(NumberUtils.safeParseInt(null, 312)).toBe(312);
      expect(NumberUtils.safeParseInt(undefined, 431)).toBe(431);
    });

    it("should return valid integer when input value is parseable", () => {
      expect(NumberUtils.safeParseInt("123")).toBe(123);
    });
  });
});
