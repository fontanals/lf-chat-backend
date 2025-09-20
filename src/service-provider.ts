import { Pool } from "pg";
import { DataContext, IDataContext } from "./data/context";
import { ChatRepository, IChatRepository } from "./repositories/chat";
import { IMessageRepository, MessageRepository } from "./repositories/message";
import {
  IRefreshTokenRepository,
  RefreshTokenRepository,
} from "./repositories/refresh-token";
import { ISessionRepository, SessionRepository } from "./repositories/session";
import { IUserRepository, UserRepository } from "./repositories/user";
import { AssistantService, IAssistantService } from "./services/assistant";
import { AuthService, IAuthService } from "./services/auth";
import { ChatService, IChatService } from "./services/chat";
import { IUserService, UserService } from "./services/user";

type ServiceMap = {
  DataContext: IDataContext;
  UserRepository: IUserRepository;
  SessionRepository: ISessionRepository;
  RefreshTokenRepository: IRefreshTokenRepository;
  ChatRepository: IChatRepository;
  MessageRepository: IMessageRepository;
  AssistantService: IAssistantService;
  AuthService: IAuthService;
  UserService: IUserService;
  ChatService: IChatService;
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
  private readonly parent: IServiceProvider;
  private readonly scopedServices: Partial<ServiceMap> = {};

  constructor(parent: IServiceProvider) {
    this.parent = parent;
  }

  get<TServiceIdentifier extends ServiceIdentifier>(
    identifier: TServiceIdentifier
  ): ServiceMap[TServiceIdentifier] {
    if (this.scopedServices[identifier] != null) {
      return this.scopedServices[identifier];
    }

    const instance = this.parent.get(identifier);

    this.scopedServices[identifier] = instance;

    return instance;
  }
}

export class ServiceContainer implements IServiceProvider {
  private readonly services: Partial<{
    [K in ServiceIdentifier]: ServiceDescriptor<K>;
  }> = {};

  register<TServiceIdentifier extends ServiceIdentifier>(
    descriptor: ServiceDescriptor<TServiceIdentifier>
  ) {
    this.services[descriptor.identifier] = descriptor as any;
  }

  get<TServiceIdentifier extends ServiceIdentifier>(
    identifier: TServiceIdentifier
  ): ServiceMap[TServiceIdentifier] {
    const descriptor = this.services[identifier];

    if (descriptor == null) {
      throw new Error(`${identifier} service is not registered.`);
    }

    if (descriptor.singleton && descriptor.instance != null) {
      return descriptor.instance;
    }

    const instance = descriptor.factory(this);

    if (descriptor.singleton) {
      descriptor.instance = instance;
    }

    return instance;
  }

  createScope(): ServiceScope {
    return new ServiceScope(this);
  }
}

export function registerServices(services: ServiceContainer, pool: Pool) {
  services.register({
    identifier: "DataContext",
    factory: () => new DataContext(pool),
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
    identifier: "ChatRepository",
    factory: (services) => new ChatRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "MessageRepository",
    factory: (services) => new MessageRepository(services.get("DataContext")),
  });

  services.register({
    identifier: "AssistantService",
    factory: () => new AssistantService(),
    singleton: true,
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
    identifier: "ChatService",
    factory: (services) =>
      new ChatService(
        services.get("DataContext"),
        services.get("ChatRepository"),
        services.get("MessageRepository"),
        services.get("AssistantService")
      ),
  });
}
