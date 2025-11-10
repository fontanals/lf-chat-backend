import { ArrayUtils } from "../../../src/utils/arrays";

describe("ArrayUtils", () => {
  describe("isNullOrEmpty", () => {
    it("should return false when input array is non-empty", () => {
      expect(ArrayUtils.isNullOrEmpty([1, 2, 3])).toBe(false);
    });

    it("should return true when input array is null or empty", () => {
      expect(ArrayUtils.isNullOrEmpty([])).toBe(true);
      expect(ArrayUtils.isNullOrEmpty(null)).toBe(true);
      expect(ArrayUtils.isNullOrEmpty(undefined)).toBe(true);
    });
  });

  describe("firstOrNull", () => {
    it("should return null when input array is null or empty", () => {
      expect(ArrayUtils.firstOrNull([])).toBeNull();
      expect(ArrayUtils.firstOrNull(null)).toBeNull();
      expect(ArrayUtils.firstOrNull(undefined)).toBeNull();
    });

    it("should return the first element when input array is non-empty", () => {
      expect(ArrayUtils.firstOrNull([1, 2, 3])).toBe(1);
    });
  });

  describe("count", () => {
    it("should return 0 when value is not found in the array", () => {
      expect(ArrayUtils.count([1, 2, 3, 2, 4], 5)).toBe(0);
    });

    it("should return the correct count of the value in the array", () => {
      expect(ArrayUtils.count([1, 2, 3, 2, 4], 2)).toBe(2);
    });
  });
});
