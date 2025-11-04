export type UpdateUserRequest = {
  name?: string;
  displayName?: string;
  customPrompt?: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};
