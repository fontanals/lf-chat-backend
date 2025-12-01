export type SignupRequest = { name: string; email: string; password: string };

export type VerifyAccountRequest = { token: string };

export type SigninRequest = { email: string; password: string };

export type RecoverPasswordRequest = { email: string };

export type ResetPasswordRequest = { token: string; newPassword: string };
