import type { ComponentDefinitionSnapshot, CustomComponentPreset } from '@screencraft/shared';
import { get, post } from './http';

export function fetchComponentPresets(
  scope: 'personal' | 'public' = 'personal',
  category?: 'chart' | 'decoration',
): Promise<CustomComponentPreset[]> {
  return get<CustomComponentPreset[]>('/component-presets', { params: { scope, category } });
}

export function createComponentPreset(payload: {
  name: string;
  description?: string;
  definition: ComponentDefinitionSnapshot;
  thumbnail?: string;
}): Promise<CustomComponentPreset> {
  return post<CustomComponentPreset>('/component-presets', payload);
}

export function updateComponentPreset(
  id: string,
  payload: { name?: string; description?: string; definition?: ComponentDefinitionSnapshot; thumbnail?: string },
): Promise<CustomComponentPreset> {
  return post<CustomComponentPreset>(`/component-presets/${encodeURIComponent(id)}/update`, payload);
}

export function copyComponentPreset(id: string): Promise<CustomComponentPreset> {
  return post<CustomComponentPreset>(`/component-presets/${encodeURIComponent(id)}/copy`);
}

export function deleteComponentPreset(id: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(`/component-presets/${encodeURIComponent(id)}/delete`);
}
