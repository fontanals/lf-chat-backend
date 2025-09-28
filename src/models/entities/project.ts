import { Document } from "./document";

export type Project = {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  documents?: Document[];
};
