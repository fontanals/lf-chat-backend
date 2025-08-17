export type GetChatsQuery = {
  page?: string;
  pageSize?: string;
};

export type GetChatMessagesParams = { chatId: string };

export type CreateChatRequest = { id: string; message: string };

export type SendMessageParams = { chatId: string };

export type SendMessageRequest = { id: string; content: string };

export type UpdateChatParams = { chatId: string };

export type UpdateChatRequest = { title: string };

export type DeleteChatParams = { chatId: string };
