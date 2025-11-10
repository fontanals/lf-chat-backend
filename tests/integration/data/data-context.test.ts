import { randomUUID } from "crypto";
import { DataContext } from "../../../src/data/data-context";
import { User } from "../../../src/models/entities/user";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("DataContext", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);

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

  const getUsers = async () => {
    return await dataContext.query<User>(
      `SELECT
        id,
        name,
        email,
        password,
        display_name AS "displayName",
        custom_prompt AS "customPrompt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "user";`
    );
  };

  const insertUser = async (user: User) => {
    await dataContext.execute(
      `INSERT INTO "user"
      (id, name, email, password, display_name, custom_prompt)
      VALUES
      ($1, $2, $3, $4, $5, $6);`,
      [
        user.id,
        user.name,
        user.email,
        user.password,
        user.displayName,
        user.customPrompt,
      ]
    );
  };

  beforeEach(async () => {
    await insertUsers(mockUsers, pool);
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

      expect(result.rows).toEqual(mockUsers);
    });
  });

  describe("execute", () => {
    it("should create a new user", async () => {
      const newUser: User = {
        id: randomUUID(),
        name: "New User",
        email: "new.user@example.com",
        password: "password",
        displayName: "New User",
        customPrompt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await insertUser(newUser);

      const result = await getUsers();

      expect(result.rows).toEqual([
        ...mockUsers,
        {
          ...newUser,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ]);
    });
  });

  describe("transaction", () => {
    it("should rollback transaction", async () => {
      await dataContext.begin();

      await insertUser({
        id: randomUUID(),
        name: "New User",
        email: "new.user@example.com",
        password: "password",
        displayName: "New User",
        customPrompt: null,
      });

      await dataContext.rollback();

      const result = await getUsers();

      expect(result.rows).toEqual(mockUsers);
    });

    it("should commit transaction", async () => {
      const newUser: User = {
        id: randomUUID(),
        name: "New User",
        email: "new.user@example.com",
        password: "password",
        displayName: "New User",
        customPrompt: null,
      };

      await dataContext.begin();

      await insertUser(newUser);

      await dataContext.commit();

      const result = await getUsers();

      expect(result.rows).toEqual([
        ...mockUsers,
        {
          ...newUser,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ]);
    });
  });
});
