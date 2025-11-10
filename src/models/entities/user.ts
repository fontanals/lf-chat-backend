export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  displayName: string;
  customPrompt?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserDto = Omit<User, "password">;

export function mapUserToDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    displayName: user.displayName,
    customPrompt: user.customPrompt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
