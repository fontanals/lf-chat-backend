import { NullableString } from "./types";

export class NumberUtils {
  static safeParseInt(value: NullableString, fallbackValue = 0): number {
    if (value == null) {
      return fallbackValue;
    }

    const parsedValue = parseInt(value);

    const result = isNaN(parsedValue) ? fallbackValue : parsedValue;

    return result;
  }
}
