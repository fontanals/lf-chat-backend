import { IDataContext } from "../../../src/data/context";
import { Message } from "../../../src/models/entities/message";
import { MessageRepository } from "../../../src/repositories/message";

describe("MessageRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let messageRepository: MessageRepository;

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    messageRepository = new MessageRepository(dataContext);
  });

  describe("findAll", () => {
    it("should return an empty array when no messages are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const result = await messageRepository.findAll();

      expect(result).toEqual([]);
    });

    it("should return messages", async () => {
      const messages: Message[] = [
        { id: "message-1", role: "user", content: "Hello", chatId: "chat-1" },
        {
          id: "message-2",
          role: "assistant",
          content: "Hi there!",
          chatId: "chat-1",
        },
      ];

      dataContext.query.mockResolvedValue({ rows: messages });

      const result = await messageRepository.findAll();

      expect(result).toEqual(messages);
    });
  });
});
