import { IDataContext } from "../../../src/data/context";
import { User } from "../../../src/models/entities/user";
import { UserRepository } from "../../../src/repositories/user";

describe("UserRepository", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let userRepository: UserRepository;

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

      const result = await userRepository.exists();

      expect(result).toBe(false);
    });

    it("should return true when a user is found", async () => {
      const user: User = {
        id: "user-id",
        name: "John Doe",
        email: "john.doe@example.com",
        password: "hashed-password",
      };

      dataContext.query.mockResolvedValue({ rows: [user] });

      const result = await userRepository.exists();

      expect(result).toBe(true);
    });
  });

  describe("findAll", () => {
    it("should return an empty array when no users are found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findAll();

      expect(result).toEqual([]);
    });

    it("should return users", async () => {
      const users: User[] = [
        {
          id: "user-1",
          name: "John Doe",
          email: "john_doe@example.com",
          password: "password",
        },
        {
          id: "user-2",
          name: "Jane Doe",
          email: "jane_doe@example.com",
          password: "password",
        },
        {
          id: "user-3",
          name: "Alice Smith",
          email: "alice_smith@example.com",
          password: "password",
        },
      ];

      dataContext.query.mockResolvedValue({ rows: users });

      const result = await userRepository.findAll();

      expect(result).toEqual(users);
    });
  });

  describe("findOne", () => {
    it("should return null when no user is found", async () => {
      dataContext.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findOne();

      expect(result).toBeNull();
    });

    it("should return user", async () => {
      const user: User = {
        id: "user -id",
        name: "John Doe",
        email: "john.doe@example.com",
        password: "hashed-password",
      };

      dataContext.query.mockResolvedValue({ rows: [user] });

      const result = await userRepository.findOne();

      expect(result).toEqual(user);
    });
  });
});
