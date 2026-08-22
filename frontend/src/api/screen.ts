import type { Category, ScreenDoc } from '@screencraft/shared';
import { get, post } from './http';

/** 项目下大屏列表 */
export function fetchScreens(projectId: string): Promise<ScreenDoc[]> {
  return get<ScreenDoc[]>(`/projects/${projectId}/screens`);
}

/** 新建空白大屏 */
export function createScreenApi(payload: {
  projectId: string;
  name: string;
  category: Category;
}): Promise<ScreenDoc> {
  return post<ScreenDoc>('/screens', payload);
}

/** 获取完整大屏 */
export function fetchScreen(id: string): Promise<ScreenDoc> {
  return get<ScreenDoc>(`/screens/${id}`);
}

/** 整屏保存 */
export function saveScreenApi(id: string, payload: Partial<ScreenDoc> & { updatedAt: string }): Promise<ScreenDoc> {
  return post<ScreenDoc>(`/screens/${id}/save`, payload);
}

/** 删除 */
export function deleteScreenApi(id: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(`/screens/${id}/delete`);
}

/** 复制 */
export function copyScreenApi(id: string): Promise<ScreenDoc> {
  return post<ScreenDoc>(`/screens/${id}/copy`);
}

/** 投放标记 */
export function setDeployedApi(id: string, deployed: boolean): Promise<ScreenDoc> {
  return post<ScreenDoc>(`/screens/${id}/deployed`, { deployed });
}
