import { Document } from "./document";

export type Project = {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  documents?: Document[];
};
