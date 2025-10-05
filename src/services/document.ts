import z from "zod";
import { IDataContext } from "../data/context";
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
        chatId: z.string().optional(),
        projectId: z.string().optional(),
      })
    );

    if (file == null) {
      throw ApplicationError.badRequest();
    }

    try {
      await this.dataContext.begin();

      const document = await this.documentManager.createDocument(
        file,
        authContext.user.id,
        request.chatId,
        request.projectId
      );

      if (request.projectId != null) {
        await this.documentManager.processDocument(document);
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
    const document = await this.documentManager.getDocument(
      params.documentId,
      authContext.user.id
    );

    if (document == null) {
      throw ApplicationError.notFound();
    }

    await this.documentManager.deleteDocument(document);

    return params.documentId;
  }
}
