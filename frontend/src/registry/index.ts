import { markRaw, type Component } from 'vue';
import { validateComponentDefinitionSnapshot, type ComponentDoc } from '@screencraft/shared';
import type { ComponentTemplate } from './types';
import { listMetas } from './meta-lookup';
import ChartLine1 from './templates/chart-line-1/ChartLine1.vue';
import ChartFamily from './renderers/ChartFamily.vue';
import KpiFamily from './renderers/KpiFamily.vue';
import TableFamily from './renderers/TableFamily.vue';
import WeatherFamily from './renderers/WeatherFamily.vue';
import BorderFamily from './renderers/BorderFamily.vue';
import Widgets from './renderers/Widgets.vue';
import SafeChartRenderer from './renderers/SafeChartRenderer.vue';

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

/** 内置模板优先；动态组件仅按通过校验的实例快照选择固定安全 renderer。 */
export function resolveComponentTemplate(doc: ComponentDoc): ComponentTemplate | undefined {
  const builtin = getTemplate(doc.templateId);
  if (builtin) {
    return builtin;
  }
  const definition = doc.definitionSnapshot;
  if (
    !definition
    || definition.rendererKey !== 'echarts-safe-v1'
    || validateComponentDefinitionSnapshot(definition).length
  ) {
    return undefined;
  }
  return {
    id: doc.templateId,
    category: definition.category,
    group: definition.group,
    label: doc.name,
    previews: { dark: '', light: '' },
    defaultSize: definition.defaultSize,
    dataProtocol: definition.dataProtocol,
    defaultStyle: definition.defaultStyle,
    styleSchema: definition.styleSchema,
    hasDataTab: Boolean(definition.dataProtocol),
    hasEventTab: true,
    renderer: markRaw(SafeChartRenderer),
  };
}

export type { ComponentTemplate, StyleField } from './types';
