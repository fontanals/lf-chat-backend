export type Session = {
  id: string;
  expiresAt: Date;
  userId: string;
  createdAt?: Date;
};
