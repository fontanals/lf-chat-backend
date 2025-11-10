import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Session } from "../../../src/models/entities/session";
import { SessionRepository } from "../../../src/repositories/session";

describe("SessionRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let sessionRepository: SessionRepository;

  const mockSessions: Session[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    expiresAt: new Date(),
    userId: randomUUID(),
    createdAt: new Date(),
  }));

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    sessionRepository = new SessionRepository(dataContext);
  });

  describe("findAll", () => {
    it("should return an empty array when no sessions are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const result = await sessionRepository.findAll();

      expect(result).toEqual([]);
    });

    it("should return sessions", async () => {
      dataContext.query.mockResolvedValue({ rows: mockSessions });

      const sessions = await sessionRepository.findAll();

      expect(sessions).toEqual(mockSessions);
    });
  });

  describe("findOne", () => {
    it("should return null when no session is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const session = await sessionRepository.findOne();

      expect(session).toBeNull();
    });

    it("should return session", async () => {
      const mockSession = mockSessions[0];

      dataContext.query.mockResolvedValue({ rows: [mockSession] });

      const session = await sessionRepository.findOne();

      expect(session).toEqual(mockSession);
    });
  });
});
