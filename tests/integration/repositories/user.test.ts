import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/context";
import { User } from "../../../src/models/entities/user";
import { UserRepository } from "../../../src/repositories/user";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("UserRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const userRepository = new UserRepository(dataContext);

  const users: User[] = [
    {
      id: randomUUID(),
      name: "user 1",
      email: "user1@example.com",
      password: "password",
      createdAt: addDays(new Date(), -50),
    },
    {
      id: randomUUID(),
      name: "user 2",
      email: "user2@example.com",
      password: "password",
      createdAt: addDays(new Date(), -102),
    },
    {
      id: randomUUID(),
      name: "user 3",
      email: "user3@example.com",
      password: "password",
      createdAt: addDays(new Date(), -13),
    },
  ];

  beforeEach(async () => {
    await insertUsers(users, pool);
  });

  afterEach(async () => {
    await truncateUsers(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("exists", () => {
    it("should return false when user does not exist", async () => {
      const userId = randomUUID();

      const exists = await userRepository.exists({ id: userId });

      expect(exists).toBe(false);
    });

    it("should return true when user exists", async () => {
      const userId = users[0].id;

      const exists = await userRepository.exists({ id: userId });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          users.map((user) => expect.objectContaining(user))
        )
      );
    });
  });

  describe("findOne", () => {
    it("should return null when user does not exist", async () => {
      const userId = randomUUID();

      const databaseUser = await userRepository.findOne({ id: userId });

      expect(databaseUser).toBeNull();
    });

    it("should return user", async () => {
      const user = users[0];

      const databaseUser = await userRepository.findOne({ id: user.id });

      expect(databaseUser).toEqual(expect.objectContaining(user));
    });
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const user: User = {
        id: randomUUID(),
        name: "user 4",
        email: "user4@example.com",
        password: "password",
      };

      await userRepository.create(user);

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          [...users, user].map((user) => expect.objectContaining(user))
        )
      );
    });
  });
});
