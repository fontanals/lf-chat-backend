import { NullableString } from "./types";

export class StringUtils {
  static isNullOrWhitespace(value: NullableString): boolean {
    return value == null || value.trim().length === 0;
  }

  static allAreNullOrWhitespace(...values: NullableString[]): boolean {
    return values.every((value) => this.isNullOrWhitespace(value));
  }
}
