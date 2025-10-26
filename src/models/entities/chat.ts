import { Project } from "./project";

export type Chat = {
  id: string;
  title: string;
  projectId?: string | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  project?: Project | null;
};
