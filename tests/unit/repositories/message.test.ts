import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Message } from "../../../src/models/entities/message";
import { MessageRepository } from "../../../src/repositories/message";

describe("MessageRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let messageRepository: MessageRepository;

  const mockMessages: Message[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    role: "user",
    content: [{ type: "text", id: randomUUID(), text: `Message ${index + 1}` }],
    feedback: null,
    finishReason: null,
    parentMessageId: null,
    chatId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
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

  describe("exists", () => {
    it("should return false when no message is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const exists = await messageRepository.exists();

      expect(exists).toBe(false);
    });

    it("should return true when a message is found", async () => {
      const mockMessage = mockMessages[0];

      dataContext.query.mockResolvedValue({ rows: [mockMessage] });

      const exists = await messageRepository.exists();

      expect(exists).toBe(true);
    });
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
