import { randomUUID } from "crypto";
import {
  AssistantContentBlock,
  TextContentBlock,
  UserMessage,
} from "../../../src/models/entities/message";
import { User } from "../../../src/models/entities/user";
import { MockAssistantService } from "../../../src/services/assistant-mock";
import { AuthContext } from "../../../src/services/auth";
import { StringUtils } from "../../../src/utils/strings";

describe("MockAssistantService", () => {
  let mockAssistantService: MockAssistantService;

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const authContext: AuthContext = {
    session: {
      id: randomUUID(),
      expiresAt: new Date().toISOString(),
      userId: mockUser.id,
      createdAt: new Date().toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  beforeEach(() => {
    mockAssistantService = new MockAssistantService();
  });

  describe("getStatus", () => {
    it("should return 'mock'", async () => {
      const mode = await mockAssistantService.getStatus();

      expect(mode).toBe("mock");
    });
  });

  describe("isContentValid", () => {
    it("should return true", async () => {
      const isValid = await mockAssistantService.isContentValid("");

      expect(isValid).toBe(true);
    });
  });

  describe("generateChatTitle", () => {
    it("should return a title", async () => {
      const title = await mockAssistantService.generateChatTitle([]);

      expect(title).toEqual(expect.any(String));
      expect(StringUtils.isNullOrWhitespace(title)).toBe(false);
    });
  });

  describe("sendMessage", () => {
    it("should send message parts and return assistant message", async () => {
      const chatId = randomUUID();

      const userMessage: UserMessage = {
        id: randomUUID(),
        role: "user",
        content: [{ type: "text", id: randomUUID(), text: "Hello" }],
        parentMessageId: null,
        chatId,
      };

      let messageId = "";
      const contentBlocks: AssistantContentBlock[] = [];
      const contentBlocksMap = new Map<string, AssistantContentBlock>();

      const assistantMessage = await mockAssistantService.sendMessage(
        {
          previousMessages: [],
          userMessage: userMessage,
          onMessagePart: (messagePart) => {
            switch (messagePart.type) {
              case "message-start": {
                messageId = messagePart.messageId;

                expect(messagePart).toEqual({
                  type: "message-start",
                  messageId: expect.any(String),
                });

                break;
              }
              case "text-start": {
                contentBlocksMap.set(messagePart.id, {
                  type: "text",
                  id: messagePart.id,
                  text: "",
                });

                expect(messagePart).toEqual({
                  type: "text-start",
                  id: expect.any(String),
                  messageId: messageId,
                });

                break;
              }
              case "text-delta": {
                const contentBlock = contentBlocksMap.get(messagePart.id)!;

                (contentBlock as TextContentBlock).text += messagePart.delta;

                expect(messagePart).toEqual({
                  type: "text-delta",
                  id: contentBlock.id,
                  delta: expect.any(String),
                  messageId: messageId,
                });

                break;
              }
              case "text-end": {
                const contentBlock = contentBlocksMap.get(messagePart.id)!;

                contentBlocks.push(contentBlock);

                expect(messagePart).toEqual({
                  type: "text-end",
                  id: expect.any(String),
                  messageId: messageId,
                });

                break;
              }
              case "message-end": {
                expect(messagePart).toEqual({
                  type: "message-end",
                  finishReason: "stop",
                  messageId: messageId,
                });
              }
            }
          },
        },
        authContext
      );

      expect(assistantMessage).toEqual({
        id: messageId,
        role: "assistant",
        content: contentBlocks,
        feedback: null,
        finishReason: "stop",
        parentMessageId: userMessage.id,
        chatId: userMessage.chatId,
      });
    });
  });
});
