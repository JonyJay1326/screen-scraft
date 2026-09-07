import { markRaw, type Component } from 'vue';
import type { ComponentTemplate } from './types';
import { listMetas } from './meta-lookup';
import ChartLine1 from './templates/chart-line-1/ChartLine1.vue';
import ChartFamily from './renderers/ChartFamily.vue';
import KpiFamily from './renderers/KpiFamily.vue';
import TableFamily from './renderers/TableFamily.vue';
import WeatherFamily from './renderers/WeatherFamily.vue';
import BorderFamily from './renderers/BorderFamily.vue';
import Widgets from './renderers/Widgets.vue';

/** 按模板 id 选择渲染器 */
function pickRenderer(id: string): Component {
  if (id === 'chart-line-1') {
    return markRaw(ChartLine1);
  }
  if (id.startsWith('chart-')) {
    return markRaw(ChartFamily);
  }
  if (id.startsWith('kpi-')) {
    return markRaw(KpiFamily);
  }
  if (id.startsWith('table-')) {
    return markRaw(TableFamily);
  }
  if (id.startsWith('weather-')) {
    return markRaw(WeatherFamily);
  }
  if (id.startsWith('border-')) {
    return markRaw(BorderFamily);
  }
  return markRaw(Widgets);
}

const templates: ComponentTemplate[] = listMetas().map((meta) => ({
  ...meta,
  renderer: pickRenderer(meta.id),
}));

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
