import type { ApiConfigDoc, ProtocolKind } from '@screencraft/shared';
import { get, post } from './http';

export type ApiConfigListItem = ApiConfigDoc & { path: string; refCount: number; method: string };

export interface UpsertApiPayload {
  name: string;
  type: 'sql' | 'external';
  sql?: string;
  external?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    authType?: 'none' | 'bearer' | 'basic';
    authSecret?: string;
  };
  params: { name: string; type: 'string' | 'number'; defaultValue?: unknown }[];
}

/** 列表 */
export function fetchApiConfigs(): Promise<ApiConfigListItem[]> {
  return get<ApiConfigListItem[]>('/api-configs');
}

/** 新建 */
export function createApiConfig(payload: UpsertApiPayload): Promise<ApiConfigListItem> {
  return post<ApiConfigListItem>('/api-configs', payload);
}

/** 更新 */
export function updateApiConfig(id: string, payload: UpsertApiPayload): Promise<ApiConfigListItem> {
  return post<ApiConfigListItem>(`/api-configs/${id}/update`, payload);
}

/** 删除 */
export function deleteApiConfig(id: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(`/api-configs/${id}/delete`);
}

/** 试运行 */
export function testApiConfig(
  id: string,
  params: Record<string, unknown>,
  protocol?: ProtocolKind,
): Promise<{ raw: unknown; columns: string[]; rows: Record<string, unknown>[]; protocolIssues: { message: string }[]; protocolValid: boolean }> {
  return post(`/api-configs/${id}/test`, { params, protocol });
}
