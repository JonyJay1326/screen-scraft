import { get, post } from './http';
import type { ScreenDoc, TencentWeatherData } from '@screencraft/shared';

/** 运行时取数 */
export function fetchDataApi(apiId: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return post(`/data/${apiId}`, params);
}

/** 内置天气 */
export function fetchWeather(adcode: string): Promise<TencentWeatherData> {
  return get<TencentWeatherData>('/weather', { params: { adcode } });
}

/** 上传资源 */
export function uploadAsset(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  return post<{ url: string }>('/assets/upload', form, { timeout: 120000 });
}

/** AI 问答 */
export function chatAi(question: string, sessionId?: string): Promise<{ answer: string }> {
  return post<{ answer: string }>('/ai/chat', { question, sessionId });
}

/** 知识库列表 */
export function fetchKbDocs(): Promise<{ _id: string; title: string; format: string; updatedAt: string }[]> {
  return get('/ai/kb-docs');
}

/** 知识库详情 */
export function fetchKbDoc(id: string): Promise<{ _id: string; title: string; content: string; format: string }> {
  return get(`/ai/kb-docs/${id}`);
}

/** 新建手册 */
export function createKbDoc(payload: { title: string; content: string; format?: string }): Promise<{ _id: string }> {
  return post('/ai/kb-docs', payload);
}

/** 更新手册 */
export function updateKbDoc(id: string, payload: { title: string; content: string; format?: string }): Promise<{ ok: true }> {
  return post(`/ai/kb-docs/${id}/update`, payload);
}

/** 删除手册 */
export function deleteKbDoc(id: string): Promise<{ ok: true }> {
  return post(`/ai/kb-docs/${id}/delete`);
}

/** AI 设置 */
export function fetchAiSettings(): Promise<{ baseUrl: string; chatModel: string; embeddingModel: string; apiKeyMasked: string }> {
  return get('/ai/settings');
}

/** 保存 AI 设置 */
export function saveAiSettings(payload: {
  baseUrl: string;
  apiKey?: string;
  chatModel: string;
  embeddingModel?: string;
}): Promise<{ baseUrl: string; chatModel: string; embeddingModel: string; apiKeyMasked: string }> {
  return post('/ai/settings', payload);
}

/** 展示页取已保存大屏 */
export function fetchDisplayScreen(id: string): Promise<ScreenDoc> {
  return get<ScreenDoc>(`/display/${id}`);
}
