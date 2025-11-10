import { ApplicationError } from "./errors";

export type NullableString = string | null | undefined;

export type NullableArray<T = unknown> = T[] | null | undefined;

export type NullablePartial<T> = {
  [K in keyof T]?: T[K] | null;
};

export enum HttpStatusCode {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

export type CursorPagination<TItem, TCursor> = {
  items: TItem[];
  totalItems: number;
  nextCursor?: TCursor;
};

export type ServerSentEvent<TEvent extends String = String, TData = unknown> =
  | { event: "start" }
  | { event: TEvent; data: TData }
  | { event: "error"; error: ApplicationError }
  | { event: "end" };
