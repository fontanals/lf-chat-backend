import { SqlUtils } from "../../../src/utils/sql";

describe("SqlUtils", () => {
  describe("value", () => {
    it("should return a string with the correct number of placeholders", () => {
      expect(SqlUtils.value(5)).toBe("$1, $2, $3, $4, $5");
    });
  });

  describe("values", () => {
    it("should return a string with the correct number of value placeholders", () => {
      expect(SqlUtils.values(3, 2)).toBe("($1, $2),\n($3, $4),\n($5, $6)");
    });
  });
});
