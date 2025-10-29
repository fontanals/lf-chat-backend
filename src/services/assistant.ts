import { randomUUID } from "crypto";
import {
  AssistantMessage,
  Message,
  MessagePart,
  SearchDocumentsToolInput,
  SearchDocumentsToolOutput,
  TextContentBlock,
  UserMessage,
} from "../models/entities/message";
import { PromiseUtils } from "../utils/promises";

const mockChats = [
  {
    title: "Squirrel Support Team",
    message:
      "Unfortunately, I can't answer your message right now… but don't worry, I've hired a team of squirrels to type a response for me. They're just a little slow. 🐿️💻",
  },
  {
    title: "Express Pigeon Delivery",
    message:
      "Unfortunately, I can't answer your message right now… but I've sent a carrier pigeon with my reply. Estimated delivery: 3-5 business days. 🕊️📜",
  },
  {
    title: "Mug Standoff",
    message:
      "Unfortunately, I can't answer your message right now… but I'm currently in a very intense staring contest with my coffee mug. ☕👀",
  },
  {
    title: "Telepathic Hotline",
    message:
      "Unfortunately, I can't answer your message right now… but if you hum loudly into your phone, I might pick it up telepathically. 🔮📱",
  },
  {
    title: "Wi-Fi's Last Chance",
    message:
      "Unfortunately, I can't answer your message right now… but I promise I'll get back to you before my Wi-Fi realizes it's unreliable again. 📶😅",
  },
  {
    title: "Time-Travel Delay",
    message:
      "Unfortunately, I can't answer your message right now… but I accidentally replied yesterday. Check your inbox in the past. ⏳🌀",
  },
  {
    title: "Alien Negotiations",
    message:
      "Unfortunately, I can't answer your message right now… but I'm in the middle of peace talks with extraterrestrials. 👽🤝🌌",
  },
  {
    title: "Ninja Training Break",
    message:
      "Unfortunately, I can't answer your message right now… but I'm practicing my ninja disappearing act. If you don't see me, it's working. 🥷💨",
  },
  {
    title: "Dragon-Sitting Duty",
    message:
      "Unfortunately, I can't answer your message right now… but I promised to babysit a dragon, and it's a little clingy. 🐉🍼",
  },
  {
    title: "Parallel Universe Login",
    message:
      "Unfortunately, I can't answer your message right now… but my account is currently logged in from a parallel dimension. 🌌🔑",
  },
  {
    title: "Robot Uprising",
    message:
      "Unfortunately, I can't answer your message right now… but my toaster just declared itself emperor and I need to negotiate. 🤖🍞",
  },
  {
    title: "Spy Mission Cover",
    message:
      "Unfortunately, I can't answer your message right now… but I'm undercover at a sandwich shop. Classified stuff. 🕵️🥪",
  },
  {
    title: "Zombie Survival Drill",
    message:
      "Unfortunately, I can't answer your message right now… but I'm testing my zombie escape plan. 🧟🏃‍♂️",
  },
  {
    title: "Unicorn Parade",
    message:
      "Unfortunately, I can't answer your message right now… but there's a unicorn parade outside and I can't miss it. 🦄🎉",
  },
  {
    title: "Invisible Mode",
    message:
      "Unfortunately, I can't answer your message right now… but I accidentally turned myself invisible and can't find the keyboard. 👻⌨️",
  },
  {
    title: "Penguin Conference",
    message:
      "Unfortunately, I can't answer your message right now… but I'm attending a very serious penguin conference in Antarctica. 🐧❄️",
  },
  {
    title: "Quantum Coffee Break",
    message:
      "Unfortunately, I can't answer your message right now… but my coffee exists in both full and empty states, and I must observe it. ☕⚛️",
  },
  {
    title: "Wizard Exam",
    message:
      "Unfortunately, I can't answer your message right now… but I'm taking my wizard finals and one wrong spell could turn me into a frog. 🧙‍♂️🐸",
  },
  {
    title: "Octopus Typing Contest",
    message:
      "Unfortunately, I can't answer your message right now… but I challenged an octopus to a typing competition. It's winning. 🐙⌨️",
  },
  {
    title: "Portal Maintenance",
    message:
      "Unfortunately, I can't answer your message right now… but I'm fixing a glitchy portal before my socks get lost in another dimension again. 🌀🧦",
  },
];

type SendMessageOptions = {
  userCustomPrompt?: string | null;
  previousMessages: Message[];
  message: UserMessage;
  documents: string[];
  onMessagePart: (messagePart: MessagePart) => void;
  onSearchDocuments: (
    input: SearchDocumentsToolInput
  ) => Promise<SearchDocumentsToolOutput>;
  abortSignal: AbortSignal;
};

export interface IAssistantService {
  generateEmbedding(text: string): Promise<number[]>;
  generateChatTitle(messages: Message[]): Promise<string>;
  validateMessage(message: Message): Promise<boolean>;
  sendMessage(options: SendMessageOptions): Promise<AssistantMessage>;
}

export class AssistantService implements IAssistantService {
  async generateEmbedding(text: string): Promise<number[]> {
    return Array.from({ length: 1536 }, () => 0.0);
  }

  async generateChatTitle(messages: Message[]): Promise<string> {
    const assistantMessage = messages.find(
      (message) => message.role === "assistant"
    );

    const textContentBlock = assistantMessage?.content.find(
      (contentBlock) => contentBlock.type === "text"
    );

    const mockChatIndex = mockChats.findIndex(
      (chat) => chat.message === textContentBlock?.text
    );

    return mockChatIndex > -1
      ? mockChats[mockChatIndex].title
      : "Imagine a title here ✨";
  }

  async validateMessage(message: Message): Promise<boolean> {
    return true;
  }

  async sendMessage(options: SendMessageOptions): Promise<AssistantMessage> {
    const response: AssistantMessage = {
      id: randomUUID(),
      role: "assistant",
      content: [],
      feedback: null,
      finishReason: "stop",
      parentMessageId: options.message.id,
      chatId: options.message.chatId,
    };

    const mockChat = mockChats[Math.floor(Math.random() * mockChats.length)];

    options.onMessagePart({ type: "message-start", messageId: response.id });

    await PromiseUtils.sleep(50);

    if (options.abortSignal.aborted) {
      options.onMessagePart({
        type: "message-end",
        messageId: response.id,
        finishReason: "interrupted",
      });

      response.finishReason = "interrupted";

      return response;
    }

    const textContentBlock: TextContentBlock = { type: "text", text: "" };

    response.content.push(textContentBlock);

    options.onMessagePart({ type: "text-start", messageId: response.id });

    await PromiseUtils.sleep(50);

    if (options.abortSignal.aborted) {
      options.onMessagePart({ type: "text-end", messageId: response.id });

      options.onMessagePart({
        type: "message-end",
        messageId: response.id,
        finishReason: "interrupted",
      });

      response.finishReason = "interrupted";

      return response;
    }

    const textParts = mockChat.message.split(" ");

    for (let index = 0; index < textParts.length; index++) {
      textContentBlock.text +=
        index < textParts.length - 1
          ? textParts[index] + " "
          : textParts[index];

      if (options.abortSignal.aborted) {
        options.onMessagePart({ type: "text-end", messageId: response.id });

        options.onMessagePart({
          type: "message-end",
          messageId: response.id,
          finishReason: "interrupted",
        });

        response.finishReason = "interrupted";

        return response;
      }

      options.onMessagePart({
        type: "text-delta",
        messageId: response.id,
        delta:
          index < textParts.length - 1
            ? textParts[index] + " "
            : textParts[index],
      });

      await PromiseUtils.sleep(50);
    }

    options.onMessagePart({ type: "text-end", messageId: response.id });

    await PromiseUtils.sleep(50);

    if (options.abortSignal.aborted) {
      options.onMessagePart({
        type: "message-end",
        messageId: response.id,
        finishReason: "interrupted",
      });

      response.finishReason = "interrupted";

      return response;
    }

    options.onMessagePart({
      type: "message-end",
      messageId: response.id,
      finishReason: "stop",
    });

    return response;
  }
}
