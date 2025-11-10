import bcrypt from "bcrypt";
import z from "zod";
import { IDataContext } from "../data/data-context";
import { IFileStorage } from "../files/file-storage";
import { mapUserToDto } from "../models/entities/user";
import {
  ChangePasswordRequest,
  UpdateUserRequest,
} from "../models/requests/user";
import {
  ChangePasswordResponse,
  DeleteUserResponse,
  GetUserResponse,
  UpdateUserResponse,
} from "../models/responses/user";
import { IDocumentRepository } from "../repositories/document";
import { IUserRepository } from "../repositories/user";
import { ApplicationError } from "../utils/errors";
import { validateRequest } from "../utils/express";
import { AuthContext } from "./auth";

export interface IUserService {
  getUser(authContext: AuthContext): Promise<GetUserResponse>;
  updateUser(
    request: UpdateUserRequest,
    authContext: AuthContext
  ): Promise<UpdateUserResponse>;
  changePassword(
    request: ChangePasswordRequest,
    authContext: AuthContext
  ): Promise<ChangePasswordResponse>;
  deleteUser(authContext: AuthContext): Promise<DeleteUserResponse>;
}

export class UserService implements IUserService {
  private readonly dataContext: IDataContext;
  private readonly fileStorage: IFileStorage;
  private readonly userRepository: IUserRepository;
  private readonly documentRepository: IDocumentRepository;

  constructor(
    dataContext: IDataContext,
    fileStorage: IFileStorage,
    userRepository: IUserRepository,
    documentRepository: IDocumentRepository
  ) {
    this.dataContext = dataContext;
    this.fileStorage = fileStorage;
    this.userRepository = userRepository;
    this.documentRepository = documentRepository;
  }

  async getUser(authContext: AuthContext): Promise<GetUserResponse> {
    const user = await this.userRepository.findOne({
      id: authContext.user.id,
    });

    if (user == null) {
      throw ApplicationError.notFound();
    }

    const userDto = mapUserToDto(user);

    return userDto;
  }

  async updateUser(
    request: UpdateUserRequest,
    authContext: AuthContext
  ): Promise<UpdateUserResponse> {
    validateRequest(
      request,
      z.object({
        name: z.string().min(1).optional(),
        displayName: z.string().min(1).optional(),
        customPreferences: z.string().nullable().optional(),
      })
    );

    const userExists = await this.userRepository.exists({
      id: authContext.user.id,
    });

    if (!userExists) {
      throw ApplicationError.notFound();
    }

    await this.userRepository.update(authContext.user.id, {
      name: request.name,
      displayName: request.displayName,
      customPrompt: request.customPrompt,
    });

    return authContext.user.id;
  }

  async changePassword(
    request: ChangePasswordRequest,
    authContext: AuthContext
  ): Promise<ChangePasswordResponse> {
    validateRequest(
      request,
      z.object({
        currentPassword: z.string(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters long."),
      })
    );

    const user = await this.userRepository.findOne({ id: authContext.user.id });

    if (user == null) {
      throw ApplicationError.notFound();
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      request.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw ApplicationError.invalidEmailOrPassword();
    }

    const hashedNewPassword = await bcrypt.hash(request.newPassword, 10);

    await this.userRepository.update(user.id, { password: hashedNewPassword });

    return user.id;
  }

  async deleteUser(authContext: AuthContext): Promise<DeleteUserResponse> {
    const documents = await this.documentRepository.findAll({
      userId: authContext.user.id,
    });

    await this.fileStorage.deleteFiles(
      documents.map((document) => document.key)
    );

    await this.userRepository.delete(authContext.user.id);

    return authContext.user.id;
  }
}
