import { Message } from "./message";

export type Chat = {
  id: string;
  title: string;
  userId: string;
  createdAt?: Date;
  messages?: Message[];
};
