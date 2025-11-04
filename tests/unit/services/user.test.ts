import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { Session } from "../../../src/models/entities/session";
import { mapUserToDto, User } from "../../../src/models/entities/user";
import { IUserRepository } from "../../../src/repositories/user";
import { AuthContext } from "../../../src/services/auth";
import { UserService } from "../../../src/services/user";

describe("UserService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let userRepository: jest.Mocked<IUserRepository>;
  let userService: UserService;

  const user: User = {
    id: randomUUID(),
    name: "user 1",
    email: "user1@example.com",
    password: "password",
    displayName: "user",
    customPreferences: null,
  };
  const userDto = mapUserToDto(user);
  const session: Session = { id: randomUUID(), userId: userDto.id };
  const authContext: AuthContext = { session, user: userDto };

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    userRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    userService = new UserService(dataContext, userRepository);
  });

  describe("getUser", () => {
    it("should return logged in user", async () => {
      userRepository.findOne.mockResolvedValue(user);

      const response = await userService.getUser(authContext);

      expect(response).toEqual({ user: userDto });
    });
  });

  describe("updateUser", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await userService.updateUser({ name: "" } as any, authContext);
        fail("Expected to throw bad request error");
      } catch (error) {
        expect((error as any).statusCode).toBe(400);
      }
    });

    it("should update user and return its id", async () => {
      userRepository.exists.mockResolvedValue(true);

      const response = await userService.updateUser(
        { name: "user 1 updated", displayName: "userupd" },
        authContext
      );

      expect(response).toEqual({ userId: authContext.user.id });
    });
  });
});
