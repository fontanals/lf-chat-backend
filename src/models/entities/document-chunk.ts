import { Document } from "./document";

export type DocumentChunk = {
  id: string;
  index: number;
  content: string;
  embedding: number[];
  documentId: string;
  createdAt?: Date;
  document?: Document;
};
