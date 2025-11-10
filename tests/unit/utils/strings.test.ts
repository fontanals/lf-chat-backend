import { StringUtils } from "../../../src/utils/strings";

describe("StringUtils", () => {
  describe("isNullOrWhitespace", () => {
    it("should return true when value is null, undefined or whitespace", () => {
      expect(StringUtils.isNullOrWhitespace("  ")).toBe(true);
      expect(StringUtils.isNullOrWhitespace(null)).toBe(true);
      expect(StringUtils.isNullOrWhitespace(undefined)).toBe(true);
    });

    it("should return false when value is not null, undefined or whitespace", () => {
      expect(StringUtils.isNullOrWhitespace("abc")).toBe(false);
    });
  });
});
