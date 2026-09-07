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

/** 展示页取已保存大屏 */
export function fetchDisplayScreen(id: string): Promise<ScreenDoc> {
  return get<ScreenDoc>(`/display/${id}`);
}
