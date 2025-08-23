import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { Session } from "../../../src/models/entities/session";
import { UserDto } from "../../../src/models/entities/user";
import { signin, signup } from "../../../src/routes/auth";
import { IServiceProvider } from "../../../src/service-provider";
import { IAuthService } from "../../../src/services/auth";

describe("Auth Routes", () => {
  let request: jest.Mocked<Request>;
  let response: jest.Mocked<Response>;
  let authService: jest.Mocked<IAuthService>;
  let services: jest.Mocked<IServiceProvider>;

  beforeEach(() => {
    request = {} as unknown as jest.Mocked<Request>;

    response = {
      header: jest.fn(),
      cookie: jest.fn(),
    } as unknown as jest.Mocked<Response>;

    authService = {
      signup: jest.fn(),
      signin: jest.fn(),
      validateAccessToken: jest.fn(),
      refreshToken: jest.fn(),
    };

    services = { get: jest.fn() };
  });

  describe("signup", () => {
    it("should return user and session with authorization header and refresh token cookie", async () => {
      services.get.mockReturnValue(authService);

      const user: UserDto = { id: randomUUID(), name: "name", email: "email" };
      const session: Session = { id: randomUUID(), userId: user.id };
      const accessToken = "access-token";
      const refreshToken = "refresh-token";

      authService.signup.mockResolvedValue({
        accessToken,
        refreshToken,
        response: { user, session },
      });

      response.header.mockReturnValue(response);

      const signupResponse = await signup(request, response, services);

      expect(signupResponse).toEqual({ session, user });
      expect(response.header).toHaveBeenCalledWith(
        "Authorization",
        `Bearer ${accessToken}`
      );
      expect(response.cookie).toHaveBeenCalledWith(
        "refreshToken",
        refreshToken,
        expect.any(Object)
      );
    });
  });

  describe("signin", () => {
    it("should return user and session with authorization header and refresh token cookie", async () => {
      services.get.mockReturnValue(authService);

      const user: UserDto = { id: randomUUID(), name: "name", email: "email" };
      const session: Session = { id: randomUUID(), userId: user.id };
      const accessToken = "access-token";
      const refreshToken = "refresh-token";

      authService.signin.mockResolvedValue({
        accessToken,
        refreshToken,
        response: { user, session },
      });

      response.header.mockReturnValue(response);

      const signinResponse = await signin(request, response, services);

      expect(signinResponse).toEqual({ session, user });
      expect(response.header).toHaveBeenCalledWith(
        "Authorization",
        `Bearer ${accessToken}`
      );
      expect(response.cookie).toHaveBeenCalledWith(
        "refreshToken",
        refreshToken,
        expect.any(Object)
      );
    });
  });
});
