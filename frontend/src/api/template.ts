import type { Category, ScreenDoc } from '@screencraft/shared';
import { get, post } from './http';

export interface TemplateListItem {
  _id: string;
  name: string;
  category: Category;
  scope: 'public' | 'personal';
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

/** 模板列表 */
export function fetchTemplates(scope: 'public' | 'personal', category?: string): Promise<TemplateListItem[]> {
  const query = category ? `?scope=${scope}&category=${encodeURIComponent(category)}` : `?scope=${scope}`;
  return get<TemplateListItem[]>(`/templates${query}`);
}

/** 模板详情（含预览用 screen 快照） */
export function fetchTemplateDetail(id: string): Promise<TemplateListItem & { screen: ScreenDoc }> {
  return get<TemplateListItem & { screen: ScreenDoc }>(`/templates/${id}`);
}

/** 另存为模板 */
export function saveAsTemplateApi(screenId: string, name: string, category: Category): Promise<TemplateListItem> {
  return post<TemplateListItem>(`/screens/${screenId}/save-as-template`, { name, category });
}

/** 以此模板新建 */
export function createScreenFromTemplateApi(templateId: string, projectId: string): Promise<ScreenDoc> {
  return post<ScreenDoc>(`/templates/${templateId}/create-screen`, { projectId });
}

/** 删除个人模板 */
export function deleteTemplateApi(id: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(`/templates/${id}/delete`);
}

/** 提升公共模板 */
export function promoteTemplateApi(id: string): Promise<TemplateListItem> {
  return post<TemplateListItem>(`/templates/${id}/promote`);
}
