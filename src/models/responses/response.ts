import { ApplicationError } from "../../utils/errors";

export type ApplicationResponse<TData> =
  | { success: true; data: TData }
  | { success: false; error: ApplicationError };

export function successResponse<TData>(
  data: TData
): ApplicationResponse<TData> {
  return { success: true, data };
}

export function errorResponse(
  error: ApplicationError
): ApplicationResponse<null> {
  return { success: false, error };
}
