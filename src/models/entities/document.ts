export type Document = {
  id: string;
  name: string;
  path: string;
  mimetype: string;
  size: number;
  chatId?: string | null;
  projectId?: string | null;
  userId: string;
  createdAt?: Date;
  udpatedAt?: Date;
  content?: string;
};
