export type RefreshToken = {
  id: string;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  sessionId: string;
  createdAt?: Date;
};
