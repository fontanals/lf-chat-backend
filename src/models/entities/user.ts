export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
};

export type UserDto = Omit<User, "password">;

export function mapUserToDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}
