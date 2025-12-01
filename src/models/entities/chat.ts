import { mapProjectToDto, Project, ProjectDto } from "./project";

export type Chat = {
  id: string;
  title: string;
  projectId?: string | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  project?: Project | null;
};

export type ChatDto = Omit<Chat, "project"> & { project?: ProjectDto | null };

export function mapChatToDto(chat: Chat): ChatDto {
  return {
    id: chat.id,
    title: chat.title,
    projectId: chat.projectId,
    userId: chat.userId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    project:
      chat.project != null ? mapProjectToDto(chat.project) : chat.project,
  };
}
