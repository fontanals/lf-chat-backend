import { randomUUID } from "crypto";
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

      const messages = await messageRepository.findAll();

      expect(messages).toEqual([]);
    });

    it("should return messages", async () => {
      const mockMessages: Message[] = [
        {
          id: randomUUID(),
          role: "user",
          content: "message",
          chatId: randomUUID(),
        },
        {
          id: randomUUID(),
          role: "assistant",
          content: "message",
          chatId: randomUUID(),
        },
      ];

      dataContext.query.mockResolvedValue({ rows: mockMessages });

      const messages = await messageRepository.findAll();

      expect(messages).toEqual(mockMessages);
    });
  });
});
