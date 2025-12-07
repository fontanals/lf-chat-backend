import { randomUUID } from "crypto";
import { IDataContext } from "../../../src/data/data-context";
import { IFileStorage } from "../../../src/files/file-storage";
import { Session } from "../../../src/models/entities/session";
import { mapUserToDto, User } from "../../../src/models/entities/user";
import { IDocumentRepository } from "../../../src/repositories/document";
import { IUserRepository } from "../../../src/repositories/user";
import { AuthContext } from "../../../src/services/auth";
import { UserService } from "../../../src/services/user";
import {
  ApplicationError,
  ApplicationErrorCode,
} from "../../../src/utils/errors";

describe("UserService", () => {
  let dataContext: jest.Mocked<IDataContext>;
  let fileStorage: jest.Mocked<IFileStorage>;
  let userRepository: jest.Mocked<IUserRepository>;
  let documentRepository: jest.Mocked<IDocumentRepository>;
  let userService: UserService;

  const mockUser: User = {
    id: randomUUID(),
    name: "User 1",
    email: "user1@example.com",
    password: "password",
    displayName: "User 1",
    customPrompt: null,
    verificationToken: null,
    recoveryToken: null,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: Session = {
    id: randomUUID(),
    userId: mockUser.id,
    expiresAt: new Date(),
    createdAt: new Date(),
  };

  const authContext: AuthContext = {
    session: {
      id: mockSession.id,
      expiresAt: mockSession.expiresAt.toISOString(),
      userId: mockSession.userId,
      createdAt: mockSession.createdAt!.toISOString(),
    },
    user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
  };

  beforeEach(() => {
    dataContext = {
      query: jest.fn(),
      execute: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    fileStorage = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      deleteFiles: jest.fn(),
    };

    userRepository = {
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    documentRepository = {
      count: jest.fn(),
      exists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getChatContextDocuments: jest.fn(),
      getAllUserChatDocuments: jest.fn(),
    };

    userService = new UserService(
      dataContext,
      fileStorage,
      userRepository,
      documentRepository
    );
  });

  describe("getUser", () => {
    it("should return user dto", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const response = await userService.getUser(authContext);

      expect(response).toEqual(mapUserToDto(mockUser));
    });
  });

  describe("updateUser", () => {
    it("should throw a bad request error when request does not match schema", async () => {
      try {
        await userService.updateUser({ name: 123 } as any, authContext);

        fail("Expected to throw bad request error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(
          ApplicationErrorCode.BadRequest
        );
      }
    });

    it("should update user and return its id", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const response = await userService.updateUser(
        { name: "User Name Updated", displayName: "User" },
        authContext
      );

      expect(response).toEqual(mockUser.id);
    });
  });

  describe("deleteUser", () => {
    it("should delete user and return its id", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      documentRepository.findAll.mockResolvedValue([]);

      const response = await userService.deleteUser(authContext);

      expect(response).toEqual(mockUser.id);
    });
  });
});
