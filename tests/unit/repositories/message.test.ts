import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Message } from "../../../src/models/entities/message";
import { MessageRepository } from "../../../src/repositories/message";

describe("MessageRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let messageRepository: MessageRepository;

  const mockMessages: Message[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message ${index + 1}`,
    chatId: randomUUID(),
  }));

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

      const messages = await messageRepository.findAll();

      expect(messages).toEqual([]);
    });

    it("should return messages", async () => {
      dataContext.query.mockResolvedValue({ rows: mockMessages });

      const messages = await messageRepository.findAll();

      expect(messages).toEqual(mockMessages);
    });
  });
});
