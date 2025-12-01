import { CookieOptions } from "express";
import { config } from "../config";

export const refreshTokenCookieName = "refreshToken";
export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};
