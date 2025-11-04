import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { User } from "../../../src/models/entities/user";
import { UserRepository } from "../../../src/repositories/user";

describe("UserRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let userRepository: UserRepository;

  const mockUsers: User[] = Array.from({ length: 5 }, (_, index) => ({
    id: randomUUID(),
    name: `user ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: "user",
    customPreferences: null,
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
