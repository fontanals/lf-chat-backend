export type GetChatsQuery = {
  search?: string;
  cursor?: string;
  limit?: string;
};

export type GetChatParams = { chatId: string };

export type GetChatMessagesParams = { chatId: string };

export type CreateChatRequest = {
  id: string;
  message: string;
  attachmentIds?: string[];
  projectId?: string | null;
};

export type SendMessageParams = { chatId: string };

export type SendMessageRequest = {
  id: string;
  content: string;
  parentId?: string | null;
  attachmentIds?: string[];
};

export type UpdateChatParams = { chatId: string };

export type UpdateChatRequest = { title: string };

export type DeleteChatParams = { chatId: string };
