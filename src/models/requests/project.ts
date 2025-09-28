export type GetProjectParams = { projectId: string };

export type GetProjectQuery = { expand?: string[] };

export type CreateProjectRequest = {
  id: string;
  name: string;
  description: string;
};

export type UpdateProjectParams = { projectId: string };

export type UpdateProjectRequest = { name?: string; description?: string };

export type DeleteProjectParams = { projectId: string };
