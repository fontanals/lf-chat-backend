import { randomUUID } from "crypto";
import { addDays } from "date-fns";
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

  const users: User[] = [
    {
      id: randomUUID(),
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -12),
    },
    {
      id: randomUUID(),
      name: "user 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -17),
    },
  ];
  const sessions: Session[] = [
    {
      id: randomUUID(),
      userId: users[0].id,
      createdAt: addDays(new Date(), -5),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      createdAt: addDays(new Date(), -2),
    },
    {
      id: randomUUID(),
      userId: users[1].id,
      createdAt: addDays(new Date(), -1),
    },
  ];

  beforeAll(async () => {
    await insertUsers(users, pool);
  });

  beforeEach(async () => {
    await insertSessions(sessions, pool);
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

      const expectedSessions = expect.arrayContaining(
        sessions.map((session) => expect.objectContaining(session))
      );

      expect(databaseSessions).toEqual(expectedSessions);
    });
  });

  describe("findOne", () => {
    it("should return null when session does not exist", async () => {
      const sessionId = randomUUID();

      const databaseSession = await sessionRepository.findOne({
        id: sessionId,
      });

      expect(databaseSession).toBeNull();
    });

    it("should return session", async () => {
      const session = sessions[0];

      const databaseSession = await sessionRepository.findOne({
        id: session.id,
      });

      expect(databaseSession).toEqual(expect.objectContaining(session));
    });
  });

  describe("create", () => {
    it("should create a new session", async () => {
      const session: Session = { id: randomUUID(), userId: users[0].id };

      await sessionRepository.create(session);

      const databaseSessions = await sessionRepository.findAll();

      expect(databaseSessions).toEqual(
        expect.arrayContaining(
          [...sessions, session].map((session) =>
            expect.objectContaining(session)
          )
        )
      );
    });
  });
});
