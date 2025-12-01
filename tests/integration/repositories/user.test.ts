import { randomUUID } from "crypto";
import { DataContext } from "../../../src/data/data-context";
import { User } from "../../../src/models/entities/user";
import { UserRepository } from "../../../src/repositories/user";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("UserRepository", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const userRepository = new UserRepository(dataContext);

  const mockUsers: User[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  beforeEach(async () => {
    await insertUsers(mockUsers, pool);
  });

  afterEach(async () => {
    await truncateUsers(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("exists", () => {
    it("should return false when user does not exist", async () => {
      const exists = await userRepository.exists({ id: randomUUID() });

      expect(exists).toBe(false);
    });

    it("should return true when user exists", async () => {
      const mockUser = mockUsers[0];

      const exists = await userRepository.exists({ id: mockUser.id });

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(mockUsers);
    });
  });

  describe("findOne", () => {
    it("should return null when user does not exist", async () => {
      const databaseUser = await userRepository.findOne({ id: randomUUID() });

      expect(databaseUser).toBeNull();
    });

    it("should return user", async () => {
      const mockUser = mockUsers[0];

      const databaseUser = await userRepository.findOne({ id: mockUser.id });

      expect(databaseUser).toEqual(mockUser);
    });
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const newUser: User = {
        id: randomUUID(),
        name: "New User",
        email: "new.user@example.com",
        password: "password",
        displayName: "New User",
        customPrompt: null,
        verificationToken: "token",
        recoveryToken: null,
        isVerified: false,
      };

      await userRepository.create(newUser);

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining([
          ...mockUsers,
          {
            ...newUser,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        ])
      );
    });
  });

  describe("update", () => {
    it("should not update user when it does not exist", async () => {
      await userRepository.update(randomUUID(), {
        displayName: "Display Name Updated",
        customPrompt: "Custom Prompt Updated",
      });

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(mockUsers);
    });

    it("should update user display name and custom prompt", async () => {
      const mockUser = mockUsers[0];

      await userRepository.update(mockUser.id, {
        displayName: "Display Name Updated",
        customPrompt: "Custom Prompt Updated",
      });

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          mockUsers.map((user) =>
            user.id === mockUser.id
              ? {
                  ...user,
                  displayName: "Display Name Updated",
                  customPrompt: "Custom Prompt Updated",
                  updatedAt: expect.any(Date),
                }
              : user
          )
        )
      );
    });
  });

  describe("delete", () => {
    it("should not delete user when it does not exist", async () => {
      await userRepository.delete(randomUUID());

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(mockUsers);
    });

    it("should delete user", async () => {
      const mockUser = mockUsers[0];

      await userRepository.delete(mockUser.id);

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          mockUsers.filter((user) => user.id !== mockUser.id)
        )
      );
    });
  });
});
