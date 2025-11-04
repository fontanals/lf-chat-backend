export type OpenAiModel =
  | "gpt-5-nano"
  | "gpt-4o-mini"
  | "text-embedding-3-small";

export const openAiModelCosts: Record<
  OpenAiModel,
  { inputTokenCostInDollars: number; outputTokenCostInDollars: number }
> = {
  "gpt-5-nano": {
    inputTokenCostInDollars: 0.00000005,
    outputTokenCostInDollars: 0.0000004,
  },
  "gpt-4o-mini": {
    inputTokenCostInDollars: 0.00000015,
    outputTokenCostInDollars: 0.0000006,
  },
  "text-embedding-3-small": {
    inputTokenCostInDollars: 0.00000002,
    outputTokenCostInDollars: 0,
  },
};

export type OpenAiModelUsage = {
  model: OpenAiModel;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type OpenAiGlobalUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostInDollars: number;
};
