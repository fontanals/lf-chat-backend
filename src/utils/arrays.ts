import { NullableArray } from "./types";

export class ArrayUtils {
  static isNullOrEmpty(array: NullableArray): boolean {
    return array == null || array.length === 0;
  }

  static firstOrNull<T>(array: NullableArray<T>): T | null {
    if (this.isNullOrEmpty(array)) {
      return null;
    }

    return array![0];
  }

  static count<TItem>(array: TItem[], value: TItem): number {
    return array.reduce(
      (count, item) => (item === value ? count + 1 : count),
      0
    );
  }
}
