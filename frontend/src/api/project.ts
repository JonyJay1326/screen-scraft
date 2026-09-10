import { get, post } from './http';

export interface ProjectListItem {
  _id: string;
  name: string;
  screenCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 项目列表 */
export function fetchProjects(): Promise<ProjectListItem[]> {
  return get<ProjectListItem[]>('/projects');
}

/** 新建项目 */
export function createProjectApi(name: string): Promise<ProjectListItem> {
  return post<ProjectListItem>('/projects', { name });
}

/** 重命名 */
export function updateProjectApi(id: string, name: string): Promise<ProjectListItem> {
  return post<ProjectListItem>(`/projects/${id}/update`, { name });
}

/** 删除 */
export function deleteProjectApi(id: string): Promise<{ ok: true; deletedScreens: number }> {
  return post<{ ok: true; deletedScreens: number }>(`/projects/${id}/delete`);
}
