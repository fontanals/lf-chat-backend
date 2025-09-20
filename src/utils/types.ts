import { ApplicationError } from "./errors";

export type NullableString = string | null | undefined;

export type NullableArray<T = unknown> = T[] | null | undefined;

export type NullablePartial<T> = {
  [K in keyof T]?: T[K] | null;
};

export type CursorPagination<TItem> = {
  items: TItem[];
  totalItems: number;
};

export type ServerSentEvent<TEvent = string, TData = unknown> = {
  event: TEvent;
  data: TData;
  isDone: boolean;
};

export type ErrorServerSentEvent = ServerSentEvent<"error", ApplicationError>;
