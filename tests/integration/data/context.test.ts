import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/context";
import { User } from "../../../src/models/entities/user";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("DataContext", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);

  const users: User[] = Array.from({ length: 3 }, (_, index) => ({
    id: randomUUID(),
    name: `user ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: "user",
    customPreferences: null,
    createdAt: addDays(new Date(), -index),
  }));

  const getUsers = async () => {
    return await dataContext.query<User>(
      `SELECT
        id,
        name,
        email,
        password,
        display_name AS "displayName",
        custom_preferences AS "customPreferences",
        created_at AS "createdAt"
      FROM "user";`
    );
  };

  const createUser = async (user: User) => {
    await dataContext.execute(
      `INSERT INTO "user"
      (id, name, email, password, display_name, custom_preferences, created_at)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7);`,
      [
        user.id,
        user.name,
        user.email,
        user.password,
        user.displayName,
        user.customPreferences,
        user.createdAt,
      ]
    );
  };

  beforeEach(async () => {
    await insertUsers(users, pool);
  });

  afterEach(async () => {
    await truncateUsers(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("query", () => {
    it("should return users", async () => {
      const result = await getUsers();

      expect(result.rows).toEqual(expect.arrayContaining(users));
    });
  });

  describe("execute", () => {
    it("should create a new user", async () => {
      const newUser: User = {
        id: randomUUID(),
        name: "new user",
        email: "new_user@example.com",
        password: "password",
        displayName: "new user",
        customPreferences: null,
        createdAt: new Date(),
      };

      await createUser(newUser);

      const result = await getUsers();

      expect(result.rows).toEqual(expect.arrayContaining([...users, newUser]));
    });
  });

  describe("transaction", () => {
    it("should rollback transaction", async () => {
      await dataContext.begin();

      await createUser({
        id: randomUUID(),
        name: "new user",
        email: "new_user@example.com",
        password: "password",
        displayName: "new user",
        customPreferences: null,
        createdAt: new Date(),
      });

      await dataContext.rollback();

      const result = await getUsers();

      expect(result.rows).toEqual(expect.arrayContaining(users));
    });

    it("should commit transaction", async () => {
      const newUser: User = {
        id: randomUUID(),
        name: "new user",
        email: "new_user@example.com",
        password: "password",
        displayName: "new user",
        customPreferences: null,
        createdAt: new Date(),
      };

      await dataContext.begin();

      await createUser(newUser);

      await dataContext.commit();

      const result = await getUsers();

      expect(result.rows).toEqual(expect.arrayContaining([...users, newUser]));
    });
  });
});
