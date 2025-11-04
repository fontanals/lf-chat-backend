import { Pool } from "pg";
import { DataContext, IDataContext } from "./data/data-context";
import { FileStorage, IFileStorage } from "./files/file-storage";
import { ChatRepository, IChatRepository } from "./repositories/chat";
import {
  DocumentRepository,
  IDocumentRepository,
} from "./repositories/document";
import {
  DocumentChunkRepository,
  IDocumentChunkRepository,
} from "./repositories/document-chunk";
import { IMessageRepository, MessageRepository } from "./repositories/message";
import {
  IOpenAiModelUsageRepository,
  OpenAiModelUsageRepository,
} from "./repositories/open-ai-model-usage";
import { IProjectRepository, ProjectRepository } from "./repositories/project";
import {
  IRefreshTokenRepository,
  RefreshTokenRepository,
} from "./repositories/refresh-token";
import { ISessionRepository, SessionRepository } from "./repositories/session";
import { IUserRepository, UserRepository } from "./repositories/user";
import { aiService } from "./services/ai";
import { AssistantService, IAssistantService } from "./services/assistant";
import { AuthService, IAuthService } from "./services/auth";
import { ChatService, IChatService } from "./services/chat";
import { DocumentService, IDocumentService } from "./services/document";
import { IProjectService, ProjectService } from "./services/project";
import { IUserService, UserService } from "./services/user";

type ServiceMap = {
  DataContext: IDataContext;
  FileStorage: IFileStorage;
  UserRepository: IUserRepository;
  SessionRepository: ISessionRepository;
  RefreshTokenRepository: IRefreshTokenRepository;
  ProjectRepository: IProjectRepository;
  ChatRepository: IChatRepository;
  MessageRepository: IMessageRepository;
  DocumentRepository: IDocumentRepository;
  DocumentChunkRepository: IDocumentChunkRepository;
  OpenAiModelUsageRepository: IOpenAiModelUsageRepository;
  AssistantService: IAssistantService;
  AuthService: IAuthService;
  UserService: IUserService;
  ProjectService: IProjectService;
  ChatService: IChatService;
  DocumentService: IDocumentService;
};

type ServiceIdentifier = keyof ServiceMap;

type ServiceFactory<TServiceIdentifier extends ServiceIdentifier> = (
  services: IServiceProvider
) => ServiceMap[TServiceIdentifier];

type ServiceDescriptor<TServiceIdentifier extends ServiceIdentifier> = {
  identifier: TServiceIdentifier;
  factory: ServiceFactory<TServiceIdentifier>;
  singleton?: boolean;
  instance?: ServiceMap[TServiceIdentifier];
};

export interface IServiceProvider {
  get<TServiceIdentifier extends ServiceIdentifier>(
    identifier: TServiceIdentifier
  ): ServiceMap[TServiceIdentifier];
}

export class ServiceScope implements IServiceProvider {
  private readonly descriptors: Partial<{
    [K in ServiceIdentifier]: ServiceDescriptor<K>;
  }>;
  private readonly scopedServices: Partial<ServiceMap> = {};

  constructor(
    descriptors: Partial<{
      [K in ServiceIdentifier]: ServiceDescriptor<K>;
    }>
  ) {
    this.descriptors = descriptors;
  }

  get<TServiceIdentifier extends ServiceIdentifier>(
    identifier: TServiceIdentifier
  ): ServiceMap[TServiceIdentifier] {
    if (this.scopedServices[identifier] != null) {
      return this.scopedServices[identifier];
    }

    const descriptor = this.descriptors[identifier];

    if (descriptor == null) {
      throw new Error(`${identifier} service is not registered.`);
    }

    const instance =
      descriptor.singleton && descriptor.instance != null
        ? descriptor.instance
        : descriptor.factory(this);

    this.scopedServices[identifier] = instance;

    return instance;
  }
}

export class ServiceContainer implements IServiceProvider {
  private readonly descriptors: Partial<{
    [K in ServiceIdentifier]: ServiceDescriptor<K>;
  }> = {};

  register<TServiceIdentifier extends ServiceIdentifier>(
    descriptor: ServiceDescriptor<TServiceIdentifier>
  ) {
    this.descriptors[descriptor.identifier] = descriptor as any;
  }

  get<TServiceIdentifier extends ServiceIdentifier>(
    identifier: TServiceIdentifier
  ): ServiceMap[TServiceIdentifier] {
    const descriptor = this.descriptors[identifier];

    if (descriptor == null) {
      throw new Error(`${identifier} service is not registered.`);
    }

    const instance =
      descriptor.singleton && descriptor.instance != null
        ? descriptor.instance
        : descriptor.factory(this);

    return instance;
  }

  createScope(): ServiceScope {
    return new ServiceScope(this.descriptors);
  }
}

export function registerServices(services: ServiceContainer, pool: Pool) {
  services.register({
    identifier: "DataContext",
    factory: () => new DataContext(pool),
  });

  services.register({
    identifier: "FileStorage",
    factory: () => new FileStorage(),
    singleton: true,
  });

  services.register({
    identifier: "UserRepository",
    factory: (services) => new UserRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "SessionRepository",
    factory: (services) => new SessionRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "RefreshTokenRepository",
    factory: (services) =>
      new RefreshTokenRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "ProjectRepository",
    factory: (services) => new ProjectRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "ChatRepository",
    factory: (services) => new ChatRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "MessageRepository",
    factory: (services) => new MessageRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "DocumentRepository",
    factory: (services) => new DocumentRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "DocumentChunkRepository",
    factory: (services) =>
      new DocumentChunkRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "OpenAiModelUsageRepository",
    factory: (services) =>
      new OpenAiModelUsageRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "AuthService",
    factory: (services) =>
      new AuthService(
        services.get("DataContext"),
        services.get("UserRepository"),
        services.get("SessionRepository"),
        services.get("RefreshTokenRepository")
      ),
  });

  services.register({
    identifier: "UserService",
    factory: (services) =>
      new UserService(
        services.get("DataContext"),
        services.get("UserRepository")
      ),
  });

  services.register({
    identifier: "AssistantService",
    factory: (services) =>
      new AssistantService(
        services.get("FileStorage"),
        services.get("DocumentRepository"),
        services.get("DocumentChunkRepository"),
        services.get("OpenAiModelUsageRepository"),
        aiService
      ),
  });

  services.register({
    identifier: "ChatService",
    factory: (services) =>
      new ChatService(
        services.get("DataContext"),
        services.get("FileStorage"),
        services.get("UserRepository"),
        services.get("ProjectRepository"),
        services.get("ChatRepository"),
        services.get("MessageRepository"),
        services.get("DocumentRepository"),
        services.get("AssistantService")
      ),
  });

  services.register({
    identifier: "ProjectService",
    factory: (services) =>
      new ProjectService(
        services.get("DataContext"),
        services.get("FileStorage"),
        services.get("ProjectRepository"),
        services.get("DocumentRepository")
      ),
  });

  services.register({
    identifier: "DocumentService",
    factory: (services) =>
      new DocumentService(
        services.get("DataContext"),
        services.get("FileStorage"),
        services.get("DocumentRepository")
      ),
  });
}
