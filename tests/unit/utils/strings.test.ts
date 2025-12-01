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

  describe("allAreNullOrWhitespace", () => {
    it("should return false when some values are not null or whitespace", () => {
      expect(StringUtils.allAreNullOrWhitespace(null, "b", undefined, "")).toBe(
        false
      );
      expect(StringUtils.allAreNullOrWhitespace(null, "b", "", undefined)).toBe(
        false
      );
      expect(StringUtils.allAreNullOrWhitespace("a", "b", "c")).toBe(false);
    });

    it("should return true when all values are null or whitespace", () => {
      expect(StringUtils.allAreNullOrWhitespace("", null, undefined)).toBe(
        true
      );
      expect(StringUtils.allAreNullOrWhitespace("", "", "")).toBe(true);
      expect(StringUtils.allAreNullOrWhitespace(null, undefined)).toBe(true);
      expect(StringUtils.allAreNullOrWhitespace()).toBe(true);
    });
  });
});
