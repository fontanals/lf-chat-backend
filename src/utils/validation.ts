import { ZodType } from "zod";
import { ApplicationError } from "./errors";

export class ValidationUtils {
  static validateRequest(request: Record<string, any>, schema: ZodType) {
    const result = schema.safeParse(request);

    if (!result.success) {
      throw ApplicationError.badRequest();
    }
  }
}
