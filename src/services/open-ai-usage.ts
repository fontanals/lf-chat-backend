import { startOfMonth } from "date-fns";
import {
  OpenAiGlobalUsage,
  OpenAiModel,
} from "../models/entities/open-ai-model-usage";
import { IOpenAiModelUsageRepository } from "../repositories/open-ai-model-usage";

export interface IOpenAiUsageService {
  getOpenAiGlobalUsage(): Promise<OpenAiGlobalUsage>;
  updateOpenAiModelUsage(openAiModelUsageData: {
    model: OpenAiModel;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }): Promise<void>;
}

export class OpenAiUsageService implements IOpenAiUsageService {
  private readonly openAiModelUsageRepository: IOpenAiModelUsageRepository;

  constructor(openAiModelUsageRepository: IOpenAiModelUsageRepository) {
    this.openAiModelUsageRepository = openAiModelUsageRepository;
  }
}
