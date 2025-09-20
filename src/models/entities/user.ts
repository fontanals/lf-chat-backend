export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  displayName: string;
  customPreferences?: string | null;
  createdAt?: Date;
};

export type UserDto = Omit<User, "password">;

export function mapUserToDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    displayName: user.displayName,
    customPreferences: user.customPreferences,
    createdAt: user.createdAt,
  };
}
