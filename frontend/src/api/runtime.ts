import { get, post } from './http';
import type { AiSettingsView, ScreenDoc, TencentWeatherData } from '@screencraft/shared';

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

/** @deprecated v0.4 前端停止新调用 */
export function chatAi(question: string, sessionId?: string): Promise<{ answer: string }> {
  return post<{ answer: string }>('/ai/chat', { question, sessionId });
}

/** @deprecated v0.4 前端停止新调用 */
export function fetchKbDocs(): Promise<{ _id: string; title: string; format: string; updatedAt: string }[]> {
  return get('/ai/kb-docs');
}

/** @deprecated v0.4 前端停止新调用 */
export function fetchKbDoc(id: string): Promise<{ _id: string; title: string; content: string; format: string }> {
  return get(`/ai/kb-docs/${id}`);
}

/** @deprecated v0.4 前端停止新调用 */
export function createKbDoc(payload: { title: string; content: string; format?: string }): Promise<{ _id: string }> {
  return post('/ai/kb-docs', payload);
}

/** @deprecated v0.4 前端停止新调用 */
export function updateKbDoc(id: string, payload: { title: string; content: string; format?: string }): Promise<{ ok: true }> {
  return post(`/ai/kb-docs/${id}/update`, payload);
}

/** @deprecated v0.4 前端停止新调用 */
export function deleteKbDoc(id: string): Promise<{ ok: true }> {
  return post(`/ai/kb-docs/${id}/delete`);
}

/** AI 设置 */
export function fetchAiSettings(): Promise<AiSettingsView> {
  return get('/ai/settings');
}

/** 保存 AI 设置 */
export function saveAiSettings(payload: {
  baseUrl: string;
  apiKey?: string;
  textModel: string;
  visionModel: string;
  visionEnabled: boolean;
}): Promise<AiSettingsView> {
  return post('/ai/settings', payload);
}

/** 分别测试 DeepSeek 文本或视觉能力 */
export function testAiSettings(capability: 'text' | 'vision'): Promise<{ capability: 'text' | 'vision'; ok: true; model: string }> {
  return post('/ai/settings/test', { capability });
}

/** 展示页取已保存大屏 */
export function fetchDisplayScreen(id: string): Promise<ScreenDoc> {
  return get<ScreenDoc>(`/display/${id}`);
}
