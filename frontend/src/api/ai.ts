import type {
  AiBorderAsset,
  AiEditorCapabilities,
  AiEditorPlanRequest,
  AiEditorPlanResponse,
  AiGenerateComponentRequest,
  AiGeneratedComponent,
  AiReferenceAsset,
  AiScreenAnalysisRequest,
  AiScreenAnalysisTestResponse,
} from '@screencraft/shared';
import { get, post } from './http';

export function getAiEditorCapabilities(): Promise<AiEditorCapabilities> {
  return get<AiEditorCapabilities>('/ai/editor/capabilities');
}

export function uploadAiReferenceAsset(file: File): Promise<AiReferenceAsset> {
  const form = new FormData();
  form.append('file', file);
  return post<AiReferenceAsset>('/ai/editor/reference-assets', form, { timeout: 30_000 });
}

export function deleteAiReferenceAsset(id: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(`/ai/editor/reference-assets/${encodeURIComponent(id)}/delete`);
}

/** 上传永久九宫格边框图。 */
export function uploadAiBorderAsset(file: File): Promise<AiBorderAsset> {
  const form = new FormData();
  form.append('file', file);
  return post<AiBorderAsset>('/ai/editor/border-assets', form, { timeout: 30_000 });
}

/** 删除本人永久边框资产。 */
export function deleteAiBorderAsset(id: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(`/ai/editor/border-assets/${encodeURIComponent(id)}/delete`);
}

/** 生成已有组件样式修改方案；请求取消时只丢弃结果，不修改画布。 */
export function createAiEditorPlan(
  payload: AiEditorPlanRequest,
  signal?: AbortSignal,
): Promise<AiEditorPlanResponse> {
  return post<AiEditorPlanResponse>('/ai/editor/plan', payload, { signal, timeout: 65_000 });
}

export function generateAiComponent(
  payload: AiGenerateComponentRequest,
  signal?: AbortSignal,
): Promise<AiGeneratedComponent> {
  return post<AiGeneratedComponent>('/ai/editor/generate-component', payload, { signal, timeout: 65_000 });
}

/** 测试视觉模型拆分完整大屏截图的能力，不修改画布。 */
export function analyzeAiScreen(
  payload: AiScreenAnalysisRequest,
  signal?: AbortSignal,
): Promise<AiScreenAnalysisTestResponse> {
  return post<AiScreenAnalysisTestResponse>('/ai/editor/analyze-screen', payload, { signal, timeout: 65_000 });
}
