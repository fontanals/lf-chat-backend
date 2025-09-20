import { UserDto } from "../entities/user";

export type GetUserResponse = { user: UserDto };

export type UpdateUserResponse = { userId: string };
