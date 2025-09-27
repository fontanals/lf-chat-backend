import { Session } from "../entities/session";
import { UserDto } from "../entities/user";

export type SignupResponse = { session: Session; user: UserDto };

export type SigninReponse = { session: Session; user: UserDto };

export type SignoutResponse = string;
