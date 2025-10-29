export type Document = {
  id: string;
  name: string;
  path: string;
  mimetype: string;
  sizeInBytes: number;
  chatId?: string | null;
  projectId?: string | null;
  userId: string;
  createdAt?: Date;
  udpatedAt?: Date;
};
