import { Request, Response } from "express";
import { IServiceProvider } from "../service-provider";
import {
  refreshTokenCookieName,
  refreshTokenCookieOptions,
} from "../utils/constants";

export async function signup(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const authService = services.get("AuthService");

  const { accessToken, refreshToken, response } = await authService.signup(
    req.body
  );

  res
    .header("Authorization", `Bearer ${accessToken}`)
    .cookie(refreshTokenCookieName, refreshToken, refreshTokenCookieOptions);

  return response;
}

export async function signin(
  req: Request,
  res: Response,
  services: IServiceProvider
) {
  const authService = services.get("AuthService");

  const { accessToken, refreshToken, response } = await authService.signin(
    req.body
  );

  res
    .header("Authorization", `Bearer ${accessToken}`)
    .cookie(refreshTokenCookieName, refreshToken, refreshTokenCookieOptions);

  return response;
}
