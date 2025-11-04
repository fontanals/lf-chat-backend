import { NullableString } from "./types";

export class StringUtils {
  static isNullOrWhitespace(value: NullableString): boolean {
    return value == null || value.trim().length === 0;
  }

  static isNullOrEmpty(value: NullableString): boolean {
    return value == null || value.length === 0;
  }

  static allIsNullOrEmpty(...values: NullableString[]): boolean {
    return values.every((value) => this.isNullOrEmpty(value));
  }
}
