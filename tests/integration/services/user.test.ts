import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { DataContext } from "../../../src/data/data-context";
import { FileStorage } from "../../../src/files/file-storage";
import { mapUserToDto, User } from "../../../src/models/entities/user";
import {
  ChangePasswordRequest,
  UpdateUserRequest,
} from "../../../src/models/requests/user";
import { DocumentRepository } from "../../../src/repositories/document";
import { UserRepository } from "../../../src/repositories/user";
import { AuthContext } from "../../../src/services/auth";
import { UserService } from "../../../src/services/user";
import { createTestPool, insertUsers, truncateUsers } from "../../utils";

describe("UserService", () => {
  const pool = createTestPool();
  const dataContext = new DataContext(pool);
  const fileStorage = new FileStorage();
  const userRepository = new UserRepository(dataContext);
  const documentRepository = new DocumentRepository(dataContext);
  const userService = new UserService(
    dataContext,
    fileStorage,
    userRepository,
    documentRepository
  );

  const mockUsers: User[] = Array.from({ length: 15 }, (_, index) => ({
    id: randomUUID(),
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    password: "password",
    displayName: `User ${index + 1}`,
    customPrompt: null,
    createdAt: addDays(new Date(), -100 + index),
    updatedAt: addDays(new Date(), -100 + index),
  }));

  const mockUser = mockUsers[0];

  const authContext: AuthContext = {
    session: {
      id: randomUUID(),
      expiresAt: new Date().toISOString(),
      userId: mockUser.id,
      createdAt: new Date().toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash("password", 10);

    await insertUsers(
      mockUsers.map((user) => ({ ...user, password: hashedPassword })),
      pool
    );
  });

  afterEach(async () => {
    await truncateUsers(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("getUser", () => {
    it("should return user dto", async () => {
      const response = await userService.getUser(authContext);

      expect(response).toEqual(mapUserToDto(mockUser));
    });
  });

  describe("updateUser", () => {
    it("should update user display name and custom prompt and return its id", async () => {
      const request: UpdateUserRequest = {
        displayName: "New Display Name",
        customPrompt: "New Custom Prompt",
      };

      const response = await userService.updateUser(request, authContext);

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          mockUsers.map((user) =>
            user.id === mockUser.id
              ? {
                  ...user,
                  password: expect.any(String),
                  displayName: "New Display Name",
                  customPrompt: "New Custom Prompt",
                  updatedAt: expect.any(Date),
                }
              : { ...user, password: expect.any(String) }
          )
        )
      );

      expect(response).toEqual(mockUser.id);
    });
  });

  describe("changePassword", () => {
    it("should change user password and return its id", async () => {
      const request: ChangePasswordRequest = {
        currentPassword: "password",
        newPassword: "new-password",
      };

      const response = await userService.changePassword(request, authContext);

      const databaseUser = await userRepository.findOne({ id: mockUser.id });

      const isPasswordUpdated = await bcrypt.compare(
        request.newPassword,
        databaseUser!.password
      );

      expect(isPasswordUpdated).toBe(true);

      expect(databaseUser).toEqual({
        ...mockUser,
        password: expect.any(String),
        updatedAt: expect.any(Date),
      });

      expect(response).toEqual(mockUser.id);
    });
  });

  describe("deleteUser", () => {
    it("should delete user and return its id", async () => {
      const response = await userService.deleteUser(authContext);

      const databaseUsers = await userRepository.findAll();

      expect(databaseUsers).toEqual(
        expect.arrayContaining(
          mockUsers
            .filter((user) => user.id !== mockUser.id)
            .map((user) => ({ ...user, password: expect.any(String) }))
        )
      );

      expect(response).toEqual(mockUser.id);
    });
  });
});
