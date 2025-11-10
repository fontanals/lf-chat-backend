import z from "zod";
import { IDataContext } from "../data/data-context";
import { IFileStorage } from "../files/file-storage";
import { Project } from "../models/entities/project";
import {
  CreateProjectRequest,
  DeleteProjectParams,
  GetProjectParams,
  GetProjectQuery,
  UpdateProjectParams,
  UpdateProjectRequest,
} from "../models/requests/project";
import {
  CreateProjectResponse,
  DeleteProjectResponse,
  GetProjectResponse,
  GetProjectsResponse,
  UpdateProjectResponse,
} from "../models/responses/project";
import { IProjectRepository } from "../repositories/project";
import { ApplicationError } from "../utils/errors";
import { getQueryStringArray, validateRequest } from "../utils/express";
import { AuthContext } from "./auth";

export interface IProjectService {
  getProjects(authContext: AuthContext): Promise<GetProjectsResponse>;
  getProject(
    params: GetProjectParams,
    query: GetProjectQuery,
    authContext: AuthContext
  ): Promise<GetProjectResponse>;
  createProject(
    request: CreateProjectRequest,
    authContext: AuthContext
  ): Promise<CreateProjectResponse>;
  updateProject(
    params: UpdateProjectParams,
    request: UpdateProjectRequest,
    authContext: AuthContext
  ): Promise<UpdateProjectResponse>;
  deleteProject(
    params: DeleteProjectParams,
    authContext: AuthContext
  ): Promise<DeleteProjectResponse>;
}

export class ProjectService implements IProjectService {
  private readonly dataContext: IDataContext;
  private readonly fileStorage: IFileStorage;
  private readonly projectRepository: IProjectRepository;

  constructor(
    dataContext: IDataContext,
    fileStorage: IFileStorage,
    projectRepository: IProjectRepository
  ) {
    this.dataContext = dataContext;
    this.fileStorage = fileStorage;
    this.projectRepository = projectRepository;
  }

  async getProjects(authContext: AuthContext): Promise<GetProjectsResponse> {
    const projects = await this.projectRepository.findAll({
      userId: authContext.user.id,
    });

    return projects;
  }

  async getProject(
    params: GetProjectParams,
    query: GetProjectQuery,
    authContext: AuthContext
  ): Promise<GetProjectResponse> {
    const expand = getQueryStringArray(query.expand);

    const project = await this.projectRepository.findOne({
      id: params.projectId,
      userId: authContext.user.id,
      includeDocuments: expand?.includes("documents"),
    });

    if (project == null) {
      throw ApplicationError.notFound();
    }

    return project;
  }

  async createProject(
    request: CreateProjectRequest,
    authContext: AuthContext
  ): Promise<CreateProjectResponse> {
    validateRequest(
      request,
      z.object({
        id: z.string(),
        title: z.string().min(1),
        description: z.string(),
      })
    );

    const project: Project = {
      id: request.id,
      title: request.title,
      description: request.description,
      userId: authContext.user.id,
    };

    await this.projectRepository.create(project);

    return project.id;
  }

  async updateProject(
    params: UpdateProjectParams,
    request: UpdateProjectRequest,
    authContext: AuthContext
  ): Promise<UpdateProjectResponse> {
    validateRequest(
      request,
      z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    );

    const projectExists = await this.projectRepository.exists({
      id: params.projectId,
      userId: authContext.user.id,
    });

    if (!projectExists) {
      throw ApplicationError.notFound();
    }

    await this.projectRepository.update(params.projectId, {
      title: request.title,
      description: request.description,
    });

    return params.projectId;
  }

  async deleteProject(
    params: DeleteProjectParams,
    authContext: AuthContext
  ): Promise<DeleteProjectResponse> {
    const project = await this.projectRepository.findOne({
      id: params.projectId,
      userId: authContext.user.id,
      includeDocuments: true,
    });

    if (project == null) {
      throw ApplicationError.notFound();
    }

    await this.fileStorage.deleteFiles(
      project.documents!.map((document) => document.key)
    );

    await this.projectRepository.delete(params.projectId);

    return params.projectId;
  }
}
