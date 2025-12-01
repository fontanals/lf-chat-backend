import { Document, DocumentDto, mapDocumentToDto } from "./document";

export type Project = {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  documents?: Document[];
};

export type ProjectDto = Omit<Project, "documents"> & {
  documents?: DocumentDto[];
};

export function mapProjectToDto(project: Project): ProjectDto {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    userId: project.userId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    documents: project.documents?.map(mapDocumentToDto),
  };
}
