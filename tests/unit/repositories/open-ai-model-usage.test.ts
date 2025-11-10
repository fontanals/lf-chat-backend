import { IDataContext } from "../../../src/data/data-context";
import { OpenAiModelUsage } from "../../../src/models/entities/open-ai-model-usage";
import { OpenAiModelUsageRepository } from "../../../src/repositories/open-ai-model-usage";

describe("OpenAiModelUsageRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let openAiModelUsageRepository: OpenAiModelUsageRepository;

  const mockOpenAiModelUsages: OpenAiModelUsage[] = Array.from(
    { length: 3 },
    (_, index) => ({
      model: "gpt-5-nano",
      inputTokens: 1000 * (index + 1),
      outputTokens: 500 * (index + 1),
      totalTokens: 1500 * (index + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    openAiModelUsageRepository = new OpenAiModelUsageRepository(dataContext);
  });

  describe("findAll", () => {
    it("should return an empty array when no open ai model usages are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const openAiModelUsages = await openAiModelUsageRepository.findAll();

      expect(openAiModelUsages).toEqual([]);
    });

    it("should return open ai model usage", async () => {
      dataContext.query.mockResolvedValue({ rows: mockOpenAiModelUsages });

      const openAiModelUsages = await openAiModelUsageRepository.findAll();

      expect(openAiModelUsages).toEqual(mockOpenAiModelUsages);
    });
  });
});
