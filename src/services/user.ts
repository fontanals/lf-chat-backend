import { IDataContext } from "../data/data-context";
import { IFileStorage } from "../files/file-storage";
import { mapUserToDto } from "../models/entities/user";
import { UpdateUserRequest } from "../models/requests/user";
import {
  DeleteUserResponse,
  GetUserResponse,
  UpdateUserResponse,
} from "../models/responses/user";
import { IDocumentRepository } from "../repositories/document";
import { IUserRepository } from "../repositories/user";
import { ApplicationError } from "../utils/errors";
import { AuthContext } from "./auth";

export interface IUserService {
  getUser(authContext: AuthContext): Promise<GetUserResponse>;
  updateUser(
    request: UpdateUserRequest,
    authContext: AuthContext
  ): Promise<UpdateUserResponse>;
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
    throw ApplicationError.gone();
  }

  async deleteUser(authContext: AuthContext): Promise<DeleteUserResponse> {
    throw ApplicationError.gone();
  }
}
