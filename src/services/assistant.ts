import { Message } from "../models/entities/message";

export interface IAssistantService {
  validateMessage(message: Message): Promise<boolean>;
  sendMessage(messages: Message[]): Promise<AsyncIterable<string>>;
}

export class AssistantService implements IAssistantService {
  async validateMessage(message: Message): Promise<boolean> {
    return true;
  }

  async sendMessage(messages: Message[]): Promise<AsyncIterable<string>> {
    return {
      [Symbol.asyncIterator]: async function* () {
        const message =
          "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Corrupti facilis laborum quas. Nulla, repellendus illo. Sapiente sequi animi reprehenderit dolores quasi vero et pariatur facere voluptatum earum corrupti aliquid incidunt dignissimos, veniam qui magni omnis, laboriosam porro error quo.";
        const chunks = message.split(" ");

        for (const chunk of chunks) {
          yield chunk + " ";
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      },
    };
  }
}
