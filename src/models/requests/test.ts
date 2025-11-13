import { Chat } from "../entities/chat";
import { Document } from "../entities/document";
import { Message, UserContentBlock } from "../entities/message";
import { Project } from "../entities/project";
import { User } from "../entities/user";

export type CreateTestDataRequest = {
  users?: User[];
  projects?: Project[];
  chats?: Chat[];
  messages?: Message[];
  documents?: (Document & { content: string })[];
};

export type TestCreateChatRequest = {
  id: string;
  message: UserContentBlock[];
  projectId?: string | null;
};

export type TestSendMessageParams = {
  chatId: string;
};

export type TestSendMessageRequest = {
  id: string;
  content: UserContentBlock[];
  parentMessageId?: string | null;
};
