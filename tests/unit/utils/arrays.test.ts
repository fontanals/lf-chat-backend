import { ArrayUtils } from "../../../src/utils/arrays";

describe("ArrayUtils", () => {
  describe("isNullOrEmpty", () => {
    it("should return false when input array is non-empty", () => {
      const result = ArrayUtils.isNullOrEmpty([1, 2, 3]);

      expect(result).toBe(false);
    });

    it("should return true when input array is null or empty", () => {
      const emptyArrayResult = ArrayUtils.isNullOrEmpty([]);
      const nullArrayResult = ArrayUtils.isNullOrEmpty(null);
      const undefinedArrayResult = ArrayUtils.isNullOrEmpty(undefined);

      expect(emptyArrayResult).toBe(true);
      expect(nullArrayResult).toBe(true);
      expect(undefinedArrayResult).toBe(true);
    });
  });

  describe("firstOrNull", () => {
    it("should return null when input array is null or empty", () => {
      const emptyArrayResult = ArrayUtils.firstOrNull([]);
      const nullArrayResult = ArrayUtils.firstOrNull(null);
      const undefinedArrayResult = ArrayUtils.firstOrNull(undefined);

      expect(emptyArrayResult).toBeNull();
      expect(nullArrayResult).toBeNull();
      expect(undefinedArrayResult).toBeNull();
    });

    it("should return the first element when input array is non-empty", () => {
      const array = [1, 2, 3];

      const result = ArrayUtils.firstOrNull(array);

      expect(result).toBe(array[0]);
    });
  });
});
