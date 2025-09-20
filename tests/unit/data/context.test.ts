import { Pool, PoolClient } from "pg";
import { DataContext } from "../../../src/data/context";

describe("DataContext", () => {
  let client: jest.Mocked<PoolClient>;
  let pool: jest.Mocked<Pool>;
  let dataContext: DataContext;

  const mockResult = { rows: [{ id: 1 }] };

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<PoolClient>;

    pool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(client),
    } as unknown as jest.Mocked<Pool>;

    dataContext = new DataContext(pool);
  });

  describe("query", () => {
    it("should execute query using pool", async () => {
      const query = "query";
      const params = ["param"];

      (pool.query as any).mockResolvedValue(mockResult);

      const result = await dataContext.query(query, params);

      expect(pool.query).toHaveBeenCalledWith(query, params);
      expect(result).toEqual(mockResult);
    });

    it("should execute query using client when using transaction", async () => {
      const query = "query";
      const params = ["param"];

      await dataContext.begin();

      (client.query as any).mockResolvedValue(mockResult);

      const result = await dataContext.query(query, params);

      expect(client.query).toHaveBeenCalledWith(query, params);
      expect(result).toEqual(mockResult);
    });
  });

  describe("execute", () => {
    it("should execute query using pool", async () => {
      const query = "query";
      const params = ["param"];

      await dataContext.execute(query, params);

      expect(pool.query).toHaveBeenCalledWith(query, params);
    });

    it("should execute query using client when using transaction", async () => {
      const query = "query";
      const params = ["param"];

      await dataContext.begin();

      await dataContext.execute(query, params);

      expect(client.query).toHaveBeenCalledWith(query, params);
    });
  });

  describe("begin", () => {
    it("should throw error when client is already initialized", async () => {
      await dataContext.begin();

      await expect(dataContext.begin()).rejects.toThrow();
    });

    it("should initialize client and begin transaction", async () => {
      await dataContext.begin();

      expect(pool.connect).toHaveBeenCalled();
      expect(client.query).toHaveBeenCalledWith("BEGIN;");
    });
  });

  describe("commit", () => {
    it("should throw error when client is not initialized", async () => {
      await expect(dataContext.commit()).rejects.toThrow();
    });

    it("should commit transaction and release client", async () => {
      await dataContext.begin();

      await dataContext.commit();

      expect(client.query).toHaveBeenCalledWith("COMMIT;");
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("rollback", () => {
    it("should throw error when client is not initialized", async () => {
      await expect(dataContext.rollback()).rejects.toThrow();
    });

    it("should rollback transaction and release client", async () => {
      await dataContext.begin();

      await dataContext.rollback();

      expect(client.query).toHaveBeenCalledWith("ROLLBACK;");
      expect(client.release).toHaveBeenCalled();
    });
  });
});
