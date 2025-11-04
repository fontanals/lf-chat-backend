import { IDataContext } from "../data/data-context";
import { OpenAiModelUsage } from "../models/entities/open-ai-model-usage";
import { NullablePartial } from "../utils/types";

type OpenAiModelUsageFilters = NullablePartial<OpenAiModelUsage>;

export interface IOpenAiModelUsageRepository {
  findAll(filters?: OpenAiModelUsageFilters): Promise<OpenAiModelUsage[]>;
  update(openAiModelUsage: OpenAiModelUsage): Promise<void>;
}

export class OpenAiModelUsageRepository implements IOpenAiModelUsageRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async findAll(
    filters?: OpenAiModelUsageFilters
  ): Promise<OpenAiModelUsage[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<OpenAiModelUsage>(
      `SELECT
        model,
        input_tokens AS "inputTokens",
        output_tokens AS "outputTokens",
        total_tokens AS "totalTokens",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "open_ai_model_usage"
      WHERE
        ${filters?.model != null ? `model = $${++paramsCount} AND` : ""}
        TRUE;`,
      [filters?.model].filter((param) => param != null)
    );

    return result.rows;
  }

  async update(openAiModelUsage: OpenAiModelUsage): Promise<void> {
    await this.dataContext.execute(
      `UPDATE "open_ai_model_usage"
      SET
        input_tokens = CASE
          WHEN EXTRACT(MONTH FROM updated_at) = EXTRACT(MONTH FROM now())
          AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM now())
            THEN input_tokens + $1
          ELSE $1
        END,
        output_tokens = CASE
          WHEN EXTRACT(MONTH FROM updated_at) = EXTRACT(MONTH FROM now())
          AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM now())
            THEN output_tokens + $2
          ELSE $2
        END,
        total_tokens = CASE
          WHEN EXTRACT(MONTH FROM updated_at) = EXTRACT(MONTH FROM now())
          AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM now())
            THEN total_tokens + $3
          ELSE $3
        END
      WHERE
        model = $4;`,
      [
        openAiModelUsage.inputTokens,
        openAiModelUsage.outputTokens,
        openAiModelUsage.totalTokens,
        openAiModelUsage.model,
      ]
    );
  }
}
