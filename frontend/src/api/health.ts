import { get } from './http';

export interface HealthPayload {
  ok: true;
  mongo: string;
}

/** 调用后端健康检查 */
export function fetchHealth(): Promise<HealthPayload> {
  return get<HealthPayload>('/health');
}
