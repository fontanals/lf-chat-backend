import z from "zod";
import { IDataContext } from "../data/context";
import { mapUserToDto } from "../models/entities/user";
import { UpdateUserRequest } from "../models/requests/user";
import { GetUserResponse, UpdateUserResponse } from "../models/responses/user";
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
}

export class UserService implements IUserService {
  private readonly dataContext: IDataContext;
  private readonly userRepository: IUserRepository;

  constructor(dataContext: IDataContext, userRepository: IUserRepository) {
    this.dataContext = dataContext;
    this.userRepository = userRepository;
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
}
