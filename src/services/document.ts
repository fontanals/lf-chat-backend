import z from "zod";
import { IDataContext } from "../data/context";
import { Document } from "../models/entities/document";
import {
  DeleteDocumentParams,
  UploadDocumentRequest,
} from "../models/requests/document";
import {
  DeleteDocumentResponse,
  UploadDocumentResponse,
} from "../models/responses/document";
import { ApplicationError } from "../utils/errors";
import { validateRequest } from "../utils/express";
import { AuthContext } from "./auth";
import { IDocumentManager } from "./document-manager";

export interface IDocumentService {
  uploadDocument(
    file: Express.Multer.File | undefined,
    request: UploadDocumentRequest,
    authContext: AuthContext
  ): Promise<UploadDocumentResponse>;
  deleteDocument(
    params: DeleteDocumentParams,
    authContext: AuthContext
  ): Promise<DeleteDocumentResponse>;
}

export class DocumentService implements IDocumentService {
  private readonly dataContext: IDataContext;
  private readonly documentManager: IDocumentManager;

  constructor(dataContext: IDataContext, documentManager: IDocumentManager) {
    this.dataContext = dataContext;
    this.documentManager = documentManager;
  }

  async uploadDocument(
    file: Express.Multer.File | undefined,
    request: UploadDocumentRequest,
    authContext: AuthContext
  ): Promise<UploadDocumentResponse> {
    validateRequest(
      request,
      z.object({
        id: z.string(),
        projectId: z.string().optional(),
      })
    );

    if (file == null) {
      throw ApplicationError.badRequest();
    }

    try {
      await this.dataContext.begin();

      const document: Document = {
        id: request.id,
        name: file.originalname,
        path: "",
        mimetype: file.mimetype,
        sizeInBytes: file.size,
        chatId: null,
        projectId: request.projectId,
        userId: authContext.user.id,
      };

      await this.documentManager.createDocument(document, file);

      if (request.projectId != null) {
        await this.documentManager.processDocument(document.id);
      }

      await this.dataContext.commit();

      return document.id;
    } catch (error) {
      await this.dataContext.rollback();

      throw error;
    }
  }

  async deleteDocument(
    params: DeleteDocumentParams,
    authContext: AuthContext
  ): Promise<DeleteDocumentResponse> {
    const documentExists = await this.documentManager.documentExists({
      id: params.documentId,
      userId: authContext.user.id,
    });

    if (!documentExists) {
      throw ApplicationError.notFound();
    }

    await this.documentManager.deleteDocument(params.documentId);

    return params.documentId;
  }
}
