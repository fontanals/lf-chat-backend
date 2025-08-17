export class SqlUtils {
  static value(paramsCount: number, startIndex = 1): string {
    let index = startIndex;
    return Array.from({ length: paramsCount }, () => `$${index++}`).join(", ");
  }

  static values(
    valuesCount: number,
    paramsCount: number,
    startIndex = 1
  ): string {
    let index = startIndex;
    return Array.from({ length: valuesCount }, () => {
      const value = `(${this.value(paramsCount, index)})`;
      index += paramsCount;
      return value;
    }).join(",\n");
  }
}
