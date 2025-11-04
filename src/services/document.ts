import z from "zod";
import { config } from "../config";
import { IDataContext } from "../data/data-context";
import { IFileStorage } from "../files/file-storage";
import { Document } from "../models/entities/document";
import {
  DeleteDocumentParams,
  UploadDocumentRequest,
} from "../models/requests/document";
import {
  DeleteDocumentResponse,
  UploadDocumentResponse,
} from "../models/responses/document";
import { IDocumentRepository } from "../repositories/document";
import { ApplicationError } from "../utils/errors";
import { validateRequest } from "../utils/express";
import { AuthContext } from "./auth";

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
  private readonly fileStorage: IFileStorage;
  private readonly documentRepository: IDocumentRepository;

  constructor(
    dataContext: IDataContext,
    fileStorage: IFileStorage,
    documentRepository: IDocumentRepository
  ) {
    this.dataContext = dataContext;
    this.fileStorage = fileStorage;
    this.documentRepository = documentRepository;
  }

  async uploadDocument(
    file: Express.Multer.File | undefined,
    request: UploadDocumentRequest,
    authContext: AuthContext
  ): Promise<UploadDocumentResponse> {
    validateRequest(
      request,
      z.object({ id: z.string(), projectId: z.string().optional() })
    );

    if (file == null) {
      throw ApplicationError.badRequest();
    }

    const userDocumentsCount = await this.documentRepository.count({
      userId: authContext.user.id,
    });

    if (userDocumentsCount >= config.MAX_DOCUMENTS_PER_USER) {
      throw ApplicationError.maxUserDocumentsReached();
    }

    const document: Document = {
      id: request.id,
      key: `${authContext.user.id}/${request.id}_${file.originalname}`,
      name: file.originalname,
      mimetype: file.mimetype,
      sizeInBytes: file.size,
      isProcessed: false,
      chatId: null,
      projectId: request.projectId,
      userId: authContext.user.id,
    };

    await this.fileStorage.writeFile(
      document.key,
      document.mimetype,
      file.buffer
    );

    await this.documentRepository.create(document);

    return document.id;
  }

  async deleteDocument(
    params: DeleteDocumentParams,
    authContext: AuthContext
  ): Promise<DeleteDocumentResponse> {
    const document = await this.documentRepository.findOne({
      id: params.documentId,
      userId: authContext.user.id,
    });

    if (document == null) {
      throw ApplicationError.notFound();
    }

    await this.fileStorage.deleteFile(document.key);

    await this.documentRepository.delete(params.documentId);

    return params.documentId;
  }
}
