export type Document = {
  id: string;
  key: string;
  name: string;
  mimetype: string;
  sizeInBytes: number;
  isProcessed: boolean;
  chatId?: string | null;
  projectId?: string | null;
  userId: string;
  createdAt?: Date;
  udpatedAt?: Date;
};
