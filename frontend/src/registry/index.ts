import { markRaw, type Component } from 'vue';
import type { ComponentTemplate } from './types';
import { chartLine1Template } from './templates/chart-line-1/meta';
import ChartLine1 from './templates/chart-line-1/ChartLine1.vue';

const templates: ComponentTemplate[] = [
  { ...chartLine1Template, renderer: markRaw(ChartLine1) as Component },
];

const map = new Map(templates.map((item) => [item.id, item]));

/** 全部模板 */
export function listTemplates(): ComponentTemplate[] {
  return templates;
}

/** 按 id 取模板 */
export function getTemplate(id: string): ComponentTemplate | undefined {
  return map.get(id);
}

export type { ComponentTemplate, StyleField } from './types';
