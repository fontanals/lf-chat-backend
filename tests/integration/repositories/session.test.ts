import { randomUUID } from "crypto";
import { DataContext } from "../../../src/data/data-context";
import { Session } from "../../../src/models/entities/session";
import { User } from "../../../src/models/entities/user";
import { SessionRepository } from "../../../src/repositories/session";
import {
  createTestPool,
  insertSessions,
  insertUsers,
  truncateSessions,
  truncateUsers,
} from "../../utils";

describe("SessionRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const sessionRepository = new SessionRepository(dataContext);

  const mockUsers: User[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const mockSessions = mockUsers.flatMap((user) =>
    Array.from({ length: 5 }, () => ({
      id: randomUUID(),
      expiresAt: new Date(),
      userId: user.id,
      createdAt: new Date(),
    }))
  );

  beforeAll(async () => {
    await insertUsers(mockUsers, pool);
  });

  beforeEach(async () => {
    await insertSessions(mockSessions, pool);
  });

  afterEach(async () => {
    await truncateSessions(pool);
  });

  afterAll(async () => {
    await truncateUsers(pool);
    await pool.end();
  });

  describe("findAll", () => {
    it("should return all sessions", async () => {
      const databaseSessions = await sessionRepository.findAll();

      expect(databaseSessions).toEqual(mockSessions);
    });
  });

  describe("findOne", () => {
    it("should return null when session does not exist", async () => {
      const databaseSession = await sessionRepository.findOne({
        id: randomUUID(),
      });

      expect(databaseSession).toBeNull();
    });

    it("should return session", async () => {
      const mockSession = mockSessions[0];

      const databaseSession = await sessionRepository.findOne({
        id: mockSession.id,
      });

      expect(databaseSession).toEqual(mockSession);
    });
  });

  describe("create", () => {
    it("should create a new session", async () => {
      const mockUser = mockUsers[0];

      const newSession: Session = {
        id: randomUUID(),
        expiresAt: new Date(),
        userId: mockUser.id,
      };

      await sessionRepository.create(newSession);

      const databaseSessions = await sessionRepository.findAll();

      expect(databaseSessions).toEqual(
        expect.arrayContaining([
          ...mockSessions,
          { ...newSession, createdAt: expect.any(Date) },
        ])
      );
    });
  });
});
