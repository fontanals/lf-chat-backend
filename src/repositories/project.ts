import { IDataContext } from "../data/context";
import { Document } from "../models/entities/document";
import { Project } from "../models/entities/project";
import { ArrayUtils } from "../utils/arrays";
import { NullablePartial } from "../utils/types";

type ProjectFilters = NullablePartial<Project & { includeDocuments: boolean }>;

type ProjectQueryRow = {
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  projectUserId: string;
  projectCreatedAt?: Date;
  projectUpdatedAt?: Date;
  documentId?: string;
  documentName?: string;
  documentPath?: string;
  documentMimetype?: string;
  documentSizeInBytes?: number;
  documentchatId?: string | null;
  documentProjectId?: string | null;
  documentUserId?: string;
  documentCreatedAt?: Date;
  documentUpdatedAt?: Date;
};

export interface IProjectRepository {
  exists(filters?: ProjectFilters): Promise<boolean>;
  findAll(filters?: ProjectFilters): Promise<Project[]>;
  findOne(filters?: ProjectFilters): Promise<Project | null>;
  create(project: Project): Promise<void>;
  update(id: string, project: NullablePartial<Project>): Promise<void>;
  delete(id: string): Promise<void>;
}

export class ProjectRepository implements IProjectRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async exists(filters?: ProjectFilters): Promise<boolean> {
    let paramsCount = 0;

    const result = await this.dataContext.query(
      `SELECT 1
      FROM "project"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
        ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const exists = !ArrayUtils.isNullOrEmpty(result.rows);

    return exists;
  }

  async findAll(filters?: ProjectFilters): Promise<Project[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<ProjectQueryRow>(
      `SELECT
        project.id AS "projectId",
        project.title AS "projectTitle",
        project.description AS "projectDescription",
        project.user_id AS "projectUserId",
        project.created_at AS "projectCreatedAt",
        project.updated_at AS "projectUpdatedAt"
        ${
          filters?.includeDocuments
            ? `, document.id AS "documentId",
              document.name AS "documentName",
              document.path AS "documentPath",
              document.mimetype AS "documentMimetype",
              document.size_in_bytes AS "documentSizeInBytes",
              document.chat_id AS "documentchatId",
              document.project_id AS "documentProjectId",
              document.user_id AS "documentUserId",
              document.created_at AS "documentCreatedAt",
              document.updated_at AS "documentUpdatedAt"`
            : ""
        }
      FROM "project"
      ${
        filters?.includeDocuments
          ? `LEFT JOIN "document" ON document.project_id = project.id`
          : ""
      }
      WHERE
        ${filters?.id != null ? `project.id = $${++paramsCount} AND` : ""}
        ${
          filters?.title != null
            ? `project.title ILIKE $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.userId != null
            ? `project.user_id = $${++paramsCount} AND`
            : ""
        }
        TRUE
      ORDER BY project.created_at DESC
      ${filters?.includeDocuments ? ", document.created_at" : ""};`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const projects = this.mapRowsToProjects(
      result.rows,
      Boolean(filters?.includeDocuments)
    );

    return projects;
  }

  async findOne(filters?: ProjectFilters): Promise<Project | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<ProjectQueryRow>(
      `WITH project_cte AS (
        SELECT *
        FROM "project"
        WHERE
          ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
          ${filters?.title != null ? `title ILIKE $${++paramsCount} AND` : ""}
          ${filters?.userId != null ? `user_id = $${++paramsCount} AND` : ""}
          TRUE
        LIMIT 1
      )
      SELECT
        project_cte.id AS "projectId",
        project_cte.title AS "projectTitle",
        project_cte.description AS "projectDescription",
        project_cte.user_id AS "projectUserId",
        project_cte.created_at AS "projectCreatedAt",
        project_cte.updated_at AS "projectUpdatedAt"
        ${
          filters?.includeDocuments
            ? `, document.id AS "documentId",
              document.name AS "documentName",
              document.path AS "documentPath",
              document.mimetype AS "documentMimetype",
              document.size_in_bytes AS "documentSizeInBytes",
              document.chat_id AS "documentchatId",
              document.project_id AS "documentProjectId",
              document.user_id AS "documentUserId",
              document.created_at AS "documentCreatedAt",
              document.updated_at AS "documentUpdatedAt"`
            : ""
        }
      FROM "project_cte"
      ${
        filters?.includeDocuments
          ? `LEFT JOIN "document" ON document.project_id = project_cte.id`
          : ""
      }
      ORDER BY project_cte.created_at DESC
      ${filters?.includeDocuments ? ", document.created_at" : ""};`,
      [
        filters?.id,
        filters?.title != null ? `%${filters.title}%` : null,
        filters?.userId,
      ].filter((param) => param != null)
    );

    const projects = this.mapRowsToProjects(
      result.rows,
      Boolean(filters?.includeDocuments)
    );

    const project = ArrayUtils.firstOrNull(projects);

    return project;
  }

  async create(project: Project): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "project"
      (id, title, description, user_id)
      VALUES
      ($1, $2, $3, $4);`,
      [project.id, project.title, project.description, project.userId]
    );
  }

  async update(id: string, project: NullablePartial<Project>): Promise<void> {
    let paramsCount = 0;

    await this.dataContext.execute(
      `UPDATE "project"
      SET
        ${project.title != null ? `name = $${++paramsCount},` : ""}
        ${project.description != null ? `description = $${++paramsCount},` : ""}
        id = id
      WHERE
        id = $${++paramsCount};`,
      [project.title, project.description, id].filter((param) => param != null)
    );
  }

  async delete(id: string): Promise<void> {
    await this.dataContext.execute(
      `DELETE FROM "project"
      WHERE
        id = $1;`,
      [id]
    );
  }

  private mapRowToProject(row: ProjectQueryRow): Project {
    return {
      id: row.projectId,
      title: row.projectTitle,
      description: row.projectDescription,
      userId: row.projectUserId,
      createdAt: row.projectCreatedAt,
      updatedAt: row.projectUpdatedAt,
    };
  }

  private mapRowToDocument(row: ProjectQueryRow): Document | null {
    if (row.documentId == null) {
      return null;
    }

    return {
      id: row.documentId,
      name: row.documentName ?? "",
      path: row.documentPath ?? "",
      mimetype: row.documentMimetype ?? "",
      sizeInBytes: row.documentSizeInBytes ?? 0,
      chatId: row.documentchatId,
      projectId: row.documentProjectId,
      userId: row.documentUserId ?? "",
      createdAt: row.documentCreatedAt,
    };
  }

  private mapRowsToProjects(
    rows: ProjectQueryRow[],
    includeDocuments: boolean
  ): Project[] {
    const projects: Project[] = [];

    let project: Project;

    rows.forEach((row) => {
      if (project == null || project.id !== row.projectId) {
        project = this.mapRowToProject(row);
        projects.push(project);
      }

      if (includeDocuments) {
        const document = this.mapRowToDocument(row);

        if (document != null) {
          project.documents = project.documents ?? [];
          project.documents.push(document);
        }
      }
    });

    return projects;
  }
}
