import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { User } from "../../../src/models/entities/user";
import { UserRepository } from "../../../src/repositories/user";

describe("UserRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let userRepository: UserRepository;

  const mockUsers: User[] = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    userRepository = new UserRepository(dataContext);
  });

  describe("count", () => {
    it("should return 0 when no users are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [{ count: "0" }] });

      const count = await userRepository.count();

      expect(count).toBe(0);
    });

    it("should return the correct user count", async () => {
      dataContext.query.mockResolvedValue({ rows: [{ count: "5" }] });

      const count = await userRepository.count();

      expect(count).toBe(5);
    });
  });

  describe("exists", () => {
    it("should return false when no user is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const exists = await userRepository.exists();

      expect(exists).toBe(false);
    });

    it("should return true when a user is found", async () => {
      const mockUser = mockUsers[0];

      dataContext.query.mockResolvedValue({ rows: [mockUser] });

      const exists = await userRepository.exists();

      expect(exists).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return an empty array when no users are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const users = await userRepository.findAll();

      expect(users).toEqual([]);
    });

    it("should return users", async () => {
      dataContext.query.mockResolvedValue({ rows: mockUsers });

      const users = await userRepository.findAll();

      expect(users).toEqual(mockUsers);
    });
  });

  describe("findOne", () => {
    it("should return null when no user is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const user = await userRepository.findOne();

      expect(user).toBeNull();
    });

    it("should return user", async () => {
      const mockUser = mockUsers[0];

      dataContext.query.mockResolvedValue({ rows: [mockUser] });

      const user = await userRepository.findOne();

      expect(user).toEqual(mockUser);
    });
  });
});
