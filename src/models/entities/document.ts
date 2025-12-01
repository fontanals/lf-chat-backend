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
  updatedAt?: Date;
};

export type DocumentDto = Omit<Document, "key">;

export function mapDocumentToDto(document: Document) {
  return {
    id: document.id,
    name: document.name,
    mimetype: document.mimetype,
    sizeInBytes: document.sizeInBytes,
    isProcessed: document.isProcessed,
    chatId: document.chatId,
    projectId: document.projectId,
    userId: document.userId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
