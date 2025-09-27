export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  isLiked?: boolean;
  parentId?: string | null;
  chatId: string;
  createdAt?: Date;
  childrenIds?: string[];
};
