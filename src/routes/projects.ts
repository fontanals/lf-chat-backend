import { Router } from "express";
import {
  DeleteProjectParams,
  GetProjectParams,
  UpdateProjectParams,
} from "../models/requests/project";
import { ServiceContainer } from "../service-provider";
import { jsonRequestHandler } from "../utils/express";

export function createProjectRoutes(serviceContainer: ServiceContainer) {
  const router = Router();

  router.get(
    "/",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const projectService = services.get("ProjectService");

      const response = await projectService.getProjects(req.authContext);

      return response;
    })
  );

  router.get(
    "/:projectId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const projectService = services.get("ProjectService");

      const response = await projectService.getProject(
        req.params as GetProjectParams,
        req.query,
        req.authContext
      );

      return response;
    })
  );

  router.post(
    "/",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const projectService = services.get("ProjectService");

      const response = await projectService.createProject(
        req.body,
        req.authContext
      );

      return response;
    })
  );

  router.patch(
    "/:projectId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const projectService = services.get("ProjectService");

      const response = await projectService.updateProject(
        req.params as UpdateProjectParams,
        req.body,
        req.authContext
      );

      return response;
    })
  );

  router.delete(
    "/:projectId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const projectService = services.get("ProjectService");

      const response = await projectService.deleteProject(
        req.params as DeleteProjectParams,
        req.authContext
      );

      return response;
    })
  );

  return router;
}
