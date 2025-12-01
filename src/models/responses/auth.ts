import { Session } from "../entities/session";
import { UserDto } from "../entities/user";

export type SignupResponse = string;

export type VerifyAccountResponse = string;

export type SigninResponse = { session: Session; user: UserDto };

export type SignoutResponse = string;

export type RecoverPasswordResponse = string;

export type ResetPasswordResponse = string;
