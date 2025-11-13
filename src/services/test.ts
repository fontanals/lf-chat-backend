import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import z from "zod";
import { IDataContext } from "../data/data-context";
import { IFileStorage } from "../files/file-storage";
import { Chat } from "../models/entities/chat";
import {
  AssistantMessage,
  ProcessDocumentToolCallContentBlock,
  ReadDocumentToolCallContentBlock,
  TextContentBlock,
  UserMessage,
} from "../models/entities/message";
import {
  CreateTestDataRequest,
  TestCreateChatRequest,
  TestSendMessageParams,
  TestSendMessageRequest,
} from "../models/requests/test";
import { SendMessageEvent } from "../models/responses/chat";
import {
  ClearTestDataResponse,
  CreateTestDataResponse,
} from "../models/responses/test";
import { IChatRepository } from "../repositories/chat";
import { IDocumentRepository } from "../repositories/document";
import { IMessageRepository } from "../repositories/message";
import { ArrayUtils } from "../utils/arrays";
import { ApplicationError } from "../utils/errors";
import { validateRequest } from "../utils/express";
import { PromiseUtils } from "../utils/promises";
import { SqlUtils } from "../utils/sql";
import { AuthContext } from "./auth";

export interface ITestService {
  createTestData(
    request: CreateTestDataRequest
  ): Promise<CreateTestDataResponse>;
  testCreateChat(
    request: TestCreateChatRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<void>;
  testSendMessage(
    params: TestSendMessageParams,
    request: TestSendMessageRequest,
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<void>;
  clearTestData(): Promise<ClearTestDataResponse>;
}

export class TestService implements ITestService {
  private readonly dataContext: IDataContext;
  private readonly fileStorage: IFileStorage;
  private readonly chatRepository: IChatRepository;
  private readonly messageRepository: IMessageRepository;
  private readonly documentRepository: IDocumentRepository;

  constructor(
    dataContext: IDataContext,
    fileStorage: IFileStorage,
    chatRepository: IChatRepository,
    messageRepository: IMessageRepository,
    documentRepository: IDocumentRepository
  ) {
    this.dataContext = dataContext;
    this.fileStorage = fileStorage;
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.documentRepository = documentRepository;
  }

  async createTestData(
    request: CreateTestDataRequest
  ): Promise<CreateTestDataResponse> {
    try {
      await this.dataContext.begin();

      if (!ArrayUtils.isNullOrEmpty(request.users)) {
        for (const user of request.users!) {
          user.password = await bcrypt.hash(user.password, 10);
        }

        await this.dataContext.execute(
          `INSERT INTO "user"
          (id, name, email, password, display_name, custom_prompt, created_at, updated_at)
          VALUES
          ${SqlUtils.values(request.users!.length, 8)};`,
          request.users!.flatMap((user) => [
            user.id,
            user.name,
            user.email,
            user.password,
            user.displayName,
            user.customPrompt,
            user.createdAt,
            user.updatedAt,
          ])
        );
      }

      if (!ArrayUtils.isNullOrEmpty(request.projects)) {
        await this.dataContext.execute(
          `INSERT INTO "project"
          (id, title, description, user_id, created_at, updated_at)
          VALUES
          ${SqlUtils.values(request.projects!.length, 6)};`,
          request.projects!.flatMap((project) => [
            project.id,
            project.title,
            project.description,
            project.userId,
            project.createdAt,
            project.updatedAt,
          ])
        );
      }

      if (!ArrayUtils.isNullOrEmpty(request.chats)) {
        await this.dataContext.execute(
          `INSERT INTO "chat"
          (id, title, project_id, user_id, created_at, updated_at)
          VALUES
          ${SqlUtils.values(request.chats!.length, 6)};`,
          request.chats!.flatMap((chat) => [
            chat.id,
            chat.title,
            chat.projectId,
            chat.userId,
            chat.createdAt,
            chat.updatedAt,
          ])
        );
      }

      if (!ArrayUtils.isNullOrEmpty(request.messages)) {
        await this.dataContext.execute(
          `INSERT INTO "message"
          (id, role, content, feedback, finish_reason, parent_message_id, chat_id, created_at, updated_at)
          VALUES
          ${SqlUtils.values(request.messages!.length, 9)};`,
          request.messages!.flatMap((message) => [
            message.id,
            message.role,
            message.content,
            message.feedback,
            message.finishReason,
            message.parentMessageId,
            message.chatId,
            message.createdAt,
            message.updatedAt,
          ])
        );
      }

      if (!ArrayUtils.isNullOrEmpty(request.documents)) {
        await Promise.all(
          request.documents!.map((document) =>
            this.fileStorage.writeFile(
              document.key,
              document.mimetype,
              Buffer.from(document.content)
            )
          )
        );

        await this.dataContext.execute(
          `INSERT INTO "document"
          (id, key, name, mimetype, size_in_bytes, is_processed, chat_id, project_id, user_id, created_at, updated_at)
          VALUES
          ${SqlUtils.values(request.documents!.length, 11)};`,
          request.documents!.flatMap((document) => [
            document.id,
            document.key,
            document.name,
            document.mimetype,
            document.sizeInBytes,
            document.isProcessed,
            document.chatId,
            document.projectId,
            document.userId,
            document.createdAt,
            document.updatedAt,
          ])
        );
      }

      await this.dataContext.commit();

      return true;
    } catch (error) {
      await this.dataContext.rollback();

      throw error;
    }
  }

  async testCreateChat(
    request: TestCreateChatRequest,
    authContext: AuthContext,
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<void> {
    validateRequest(
      request,
      z.object({
        id: z.string(),
        message: z.array(
          z.discriminatedUnion("type", [
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({
              type: z.literal("document"),
              id: z.string(),
              name: z.string(),
            }),
          ])
        ),
        projectId: z.string().nullable().optional(),
        userId: z.string(),
      })
    );

    const chat: Chat = {
      id: request.id,
      title: "Lorem ipsum",
      projectId: request.projectId,
      userId: authContext.user.id,
    };

    const userMessage: UserMessage = {
      id: request.id,
      role: "user",
      content: request.message,
      parentMessageId: null,
      chatId: chat.id,
    };

    try {
      await this.dataContext.begin();

      await this.chatRepository.create(chat);

      await this.messageRepository.create(userMessage);

      await this.dataContext.commit();
    } catch (error) {
      await this.dataContext.rollback();

      throw error;
    }

    onSendEvent({ event: "start" });

    const assistantMessage = await this.mockSendMessage(
      userMessage,
      onSendEvent
    );

    await this.messageRepository.create(assistantMessage);

    onSendEvent({ event: "end" });
  }

  async testSendMessage(
    params: TestSendMessageParams,
    request: TestSendMessageRequest,
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<void> {
    validateRequest(
      request,
      z.object({
        id: z.string(),
        content: z.array(
          z.discriminatedUnion("type", [
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({
              type: z.literal("document"),
              id: z.string(),
              name: z.string(),
            }),
          ])
        ),
        parentMessageId: z.string().nullable().optional(),
        userId: z.string(),
      })
    );

    const chat = await this.chatRepository.findOne({ id: params.chatId });

    if (chat == null) {
      throw ApplicationError.notFound();
    }

    const userMessage: UserMessage = {
      id: request.id,
      role: "user",
      content: request.content,
      parentMessageId: null,
      chatId: chat.id,
    };

    await this.messageRepository.create(userMessage);

    onSendEvent({ event: "start" });

    const assistantMessage = await this.mockSendMessage(
      userMessage,
      onSendEvent
    );

    await this.messageRepository.create(assistantMessage);

    onSendEvent({ event: "end" });
  }

  async clearTestData(): Promise<ClearTestDataResponse> {
    try {
      await this.dataContext.begin();

      await this.dataContext.execute(`TRUNCATE "user" CASCADE;`);
      await this.dataContext.execute(`TRUNCATE "open_ai_model_usage";`);

      await this.dataContext.commit();

      return true;
    } catch (error) {
      await this.dataContext.rollback();

      throw error;
    }
  }

  private async mockSendMessage(
    userMessage: UserMessage,
    onSendEvent: (event: SendMessageEvent) => void
  ): Promise<AssistantMessage> {
    const assistantMessage: AssistantMessage = {
      id: randomUUID(),
      role: "assistant",
      content: [],
      feedback: null,
      finishReason: "stop",
      parentMessageId: userMessage.id,
      chatId: userMessage.chatId,
    };

    await PromiseUtils.sleep(50);

    onSendEvent({
      event: "message-start",
      data: { type: "message-start", messageId: assistantMessage.id },
    });

    const documentContentBlocks = userMessage.content.filter(
      (contentBlock) => contentBlock.type === "document"
    );

    for (const documentContentBlock of documentContentBlocks) {
      const document = await this.documentRepository.findOne({
        id: documentContentBlock.id,
      });

      if (document == null) {
        throw ApplicationError.badRequest();
      }

      if (!document.isProcessed) {
        const processDocumentContentBlock: ProcessDocumentToolCallContentBlock =
          {
            type: "tool-call",
            id: randomUUID(),
            name: "processDocument",
            input: {
              id: documentContentBlock.id,
              name: documentContentBlock.name,
            },
            output: { success: true, data: documentContentBlock.id },
          };

        assistantMessage.content.push(processDocumentContentBlock);

        await PromiseUtils.sleep(50);

        onSendEvent({
          event: "tool-call-start",
          data: {
            type: "tool-call-start",
            id: processDocumentContentBlock.id,
            name: "processDocument",
            messageId: assistantMessage.id,
          },
        });

        const processDocumentDeltas = JSON.stringify(
          processDocumentContentBlock
        ).split(" ");

        for (let index = 0; index < processDocumentDeltas.length; index++) {
          await PromiseUtils.sleep(50);

          onSendEvent({
            event: "tool-call-delta",
            data: {
              type: "tool-call-delta",
              id: processDocumentContentBlock.id,
              name: "processDocument",
              delta:
                index < processDocumentDeltas.length - 1
                  ? processDocumentDeltas[index] + " "
                  : processDocumentDeltas[index],
              messageId: assistantMessage.id,
            },
          });
        }

        await PromiseUtils.sleep(50);

        onSendEvent({
          event: "tool-call",
          data: {
            type: "tool-call",
            id: processDocumentContentBlock.id,
            name: "processDocument",
            input: processDocumentContentBlock.input,
            messageId: assistantMessage.id,
          },
        });

        await PromiseUtils.sleep(50);

        onSendEvent({
          event: "tool-call-result",
          data: {
            type: "tool-call-result",
            id: processDocumentContentBlock.id,
            name: "processDocument",
            input: processDocumentContentBlock.input,
            output: processDocumentContentBlock.output,
            messageId: assistantMessage.id,
          },
        });

        onSendEvent({
          event: "tool-call-end",
          data: {
            type: "tool-call-end",
            id: processDocumentContentBlock.id,
            name: "processDocument",
            messageId: assistantMessage.id,
          },
        });
      }

      const readDocumentContentBlock: ReadDocumentToolCallContentBlock = {
        type: "tool-call",
        id: randomUUID(),
        name: "readDocument",
        input: {
          id: documentContentBlock.id,
          name: documentContentBlock.name,
          query: "",
        },
        output: { success: true, data: `<document-chunk>...</document-chunk>` },
      };

      assistantMessage.content.push(readDocumentContentBlock);

      await PromiseUtils.sleep(50);

      onSendEvent({
        event: "tool-call-start",
        data: {
          type: "tool-call-start",
          id: readDocumentContentBlock.id,
          name: "readDocument",
          messageId: assistantMessage.id,
        },
      });

      const readDocumentDeltas = JSON.stringify(readDocumentContentBlock).split(
        " "
      );

      for (let index = 0; index < readDocumentDeltas.length; index++) {
        await PromiseUtils.sleep(50);

        onSendEvent({
          event: "tool-call-delta",
          data: {
            type: "tool-call-delta",
            id: readDocumentContentBlock.id,
            name: "readDocument",
            delta:
              index < readDocumentDeltas.length - 1
                ? readDocumentDeltas[index] + " "
                : readDocumentDeltas[index],
            messageId: assistantMessage.id,
          },
        });
      }

      await PromiseUtils.sleep(50);

      onSendEvent({
        event: "tool-call",
        data: {
          type: "tool-call",
          id: readDocumentContentBlock.id,
          name: "readDocument",
          input: readDocumentContentBlock.input,
          messageId: assistantMessage.id,
        },
      });

      await PromiseUtils.sleep(50);

      onSendEvent({
        event: "tool-call-result",
        data: {
          type: "tool-call-result",
          id: readDocumentContentBlock.id,
          name: "readDocument",
          input: readDocumentContentBlock.input,
          output: readDocumentContentBlock.output,
          messageId: assistantMessage.id,
        },
      });

      onSendEvent({
        event: "tool-call-end",
        data: {
          type: "tool-call-end",
          id: readDocumentContentBlock.id,
          name: "readDocument",
          messageId: assistantMessage.id,
        },
      });
    }

    const textContentBlock: TextContentBlock = {
      type: "text",
      id: randomUUID(),
      text: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus fugiat non nulla asperiores molestias, doloremque dolorum nostrum ea quis quasi dicta delectus, omnis sequi, reiciendis quidem voluptatem nesciunt ex? Rerum, quo sit beatae officia provident molestias praesentium aut maiores obcaecati non dolore sint, hic impedit totam dolores consectetur labore ab vel a deserunt distinctio voluptas commodi! Illum tenetur veritatis, commodi eveniet fuga magnam. Expedita laborum aliquam architecto labore tempora cumque consequatur libero inventore, debitis sit. Recusandae ex esse officiis inventore eum quibusdam fugiat, minus labore aut suscipit impedit fuga error voluptatem repellendus, itaque maiores assumenda eius a velit provident perferendis!",
    };

    assistantMessage.content.push(textContentBlock);

    await PromiseUtils.sleep(50);

    onSendEvent({
      event: "text-start",
      data: {
        type: "text-start",
        id: textContentBlock.id,
        messageId: assistantMessage.id,
      },
    });

    const textDeltas = textContentBlock.text.split(" ");

    for (let index = 0; index < textDeltas.length; index++) {
      await PromiseUtils.sleep(50);

      onSendEvent({
        event: "text-delta",
        data: {
          type: "text-delta",
          id: textContentBlock.id,
          delta:
            index < textDeltas.length - 1
              ? textDeltas[index] + " "
              : textDeltas[index],
          messageId: assistantMessage.id,
        },
      });
    }

    await PromiseUtils.sleep(50);

    onSendEvent({
      event: "text-end",
      data: {
        type: "text-end",
        id: textContentBlock.id,
        messageId: assistantMessage.id,
      },
    });

    await PromiseUtils.sleep(50);

    onSendEvent({
      event: "message-end",
      data: {
        type: "message-end",
        finishReason: "stop",
        messageId: assistantMessage.id,
      },
    });

    return assistantMessage;
  }
}
