export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  displayName: string;
  customPrompt?: string | null;
  verificationToken?: string | null;
  recoveryToken?: string | null;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserDto = Omit<
  User,
  "password" | "verificationToken" | "recoveryToken" | "isVerified"
>;

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
