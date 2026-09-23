import { BaseRepository } from "./base.repository";
import type { Project, ProjectGroup } from "@/features/projects";
import { RecordListOptions } from "pocketbase";

export class ProjectsRepository extends BaseRepository<Project> {
  constructor() {
    super("projects");
  }

  async getProjectsByUser(
    userId: string,
    options?: RecordListOptions,
  ): Promise<Project[]> {
    const filter = `user_id = "${userId}" && deleted_at = null`;
    return this.getFullList({
      filter: options?.filter ? `(${filter}) && (${options.filter})` : filter,
      sort: options?.sort || "-created",
      ...options,
    });
  }

  async getProjectById(
    id: string,
    options?: { expand?: string; fields?: string },
  ): Promise<Project> {
    return this.getById(id, options);
  }

  async softDeleteProject(id: string): Promise<Project> {
    return this.update(id, { deleted_at: new Date().toISOString() });
  }

  async restoreProject(id: string): Promise<Project> {
    return this.update(id, { deleted_at: null });
  }
}

export class ProjectGroupsRepository extends BaseRepository<ProjectGroup> {
  constructor() {
    super("project_groups");
  }

  async getGroupsByProject(
    projectId: string,
    options?: RecordListOptions,
  ): Promise<ProjectGroup[]> {
    return this.getFullList({
      filter: `project_id = "${projectId}"`,
      sort: "sort_order,created",
      ...options,
    });
  }
}

export const projectsRepository = new ProjectsRepository();
export const projectGroupsRepository = new ProjectGroupsRepository();
