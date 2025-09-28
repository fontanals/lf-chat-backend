import { IDataContext } from "../data/context";
import { MessageAttachment } from "../models/entities/message-attachment";
import { ArrayUtils } from "../utils/arrays";
import { SqlUtils } from "../utils/sql";

export interface IMessageAttachmentRepository {
  createAll(messageAttachments: MessageAttachment[]): Promise<void>;
}

export class MessageAttachmentRepository
  implements IMessageAttachmentRepository
{
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async createAll(messageAttachments: MessageAttachment[]): Promise<void> {
    if (ArrayUtils.isNullOrEmpty(messageAttachments)) {
      return;
    }

    const params = messageAttachments.flatMap((messageAttachment) => [
      messageAttachment.messageId,
      messageAttachment.documentId,
    ]);

    await this.dataContext.execute(
      `INSERT INTO "message_attachment"
      (message_id, document_id)
      VALUES
      ${SqlUtils.values(messageAttachments.length, 2)};`,
      params
    );
  }
}
