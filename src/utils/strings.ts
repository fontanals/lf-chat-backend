import { NullableString } from "./types";

export class StringUtils {
  static isNullOrWhitespace(value: NullableString): boolean {
    return value == null || value.trim().length === 0;
  }
}
