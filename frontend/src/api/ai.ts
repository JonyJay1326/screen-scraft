import type { AiEditorPlanRequest, AiEditorPlanResponse } from '@screencraft/shared';
import { post } from './http';

/** 生成已有组件样式修改方案；请求取消时只丢弃结果，不修改画布。 */
export function createAiEditorPlan(
  payload: AiEditorPlanRequest,
  signal?: AbortSignal,
): Promise<AiEditorPlanResponse> {
  return post<AiEditorPlanResponse>('/ai/editor/plan', payload, { signal, timeout: 65_000 });
}
