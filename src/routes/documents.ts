import { Router } from "express";
import { upload } from "../middlewares/upload";
import { DeleteDocumentParams } from "../models/requests/document";
import { ServiceContainer } from "../service-provider";
import { jsonRequestHandler } from "../utils/express";

export function createDocumentRoutes(serviceContainer: ServiceContainer) {
  const router = Router();

  router.post(
    "/upload",
    upload.single("file"),
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const documentService = services.get("DocumentService");

      const response = await documentService.uploadDocument(
        req.file,
        req.body,
        req.authContext
      );

      return response;
    })
  );

  router.delete(
    "/:documentId",
    jsonRequestHandler(serviceContainer, async (req, res, services) => {
      const documentService = services.get("DocumentService");

      const response = await documentService.deleteDocument(
        req.params as DeleteDocumentParams,
        req.authContext
      );

      return response;
    })
  );

  return router;
}
