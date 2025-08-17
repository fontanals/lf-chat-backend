import { SqlUtils } from "../../../src/utils/sql";

describe("SqlUtils", () => {
  describe("value", () => {
    it("should return a string with the correct number of placeholders", () => {
      const result = SqlUtils.value(5);

      expect(result).toBe("$1, $2, $3, $4, $5");
    });
  });

  describe("values", () => {
    it("should return a string with the correct number of value placeholders", () => {
      const result = SqlUtils.values(3, 2);

      expect(result).toBe("($1, $2),\n($3, $4),\n($5, $6)");
    });
  });
});
