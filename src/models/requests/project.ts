export type GetProjectParams = { projectId: string };

export type GetProjectQuery = { expand?: string[] };

export type CreateProjectRequest = {
  id: string;
  title: string;
  description: string;
};

export type UpdateProjectParams = { projectId: string };

export type UpdateProjectRequest = { title?: string; description?: string };

export type DeleteProjectParams = { projectId: string };
