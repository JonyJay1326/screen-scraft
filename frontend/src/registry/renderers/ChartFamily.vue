<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { ComponentDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { buildChartOption } from '../chart-option';
import { getMeta } from '../meta-lookup';
import { ensureEchartsThemes, echartsThemeName } from '../../theme/echarts-theme';
import ComponentAccessories from './ComponentAccessories.vue';

const props = defineProps<{
  doc: ComponentDoc;
  data: unknown;
  mode: 'edit' | 'runtime';
}>();

const el = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;

const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => {
  const defaults = tpl.value?.defaultStyle[props.doc.theme] ?? {};
  return { ...defaults, ...props.doc.style };
});
const valid = computed(() => isProtocolValid(tpl.value?.dataProtocol, props.data));
interface PieSummaryItem {
  name: string;
  value: string;
  percent?: string;
  color: string;
}
const pieSummaryKind = computed<'alert' | 'control' | undefined>(() => {
  if (!props.doc.templateId.startsWith('chart-pie-') || !Array.isArray(props.data)) return undefined;
  const names = props.data.map((item) => isNameValueItem(item) ? item.name : '');
  if (names.includes('已解决') && names.includes('未解决')) return 'alert';
  if (['算法', '手动', 'PID'].every((name) => names.includes(name))) return 'control';
  return undefined;
});
/** 仪表盘合并了状态列表时，mockData 第一项是主值，其余项按运行/故障/停机语义着色显示在右侧。 */
const gaugeSummaryItems = computed<PieSummaryItem[]>(() => {
  if (!props.doc.templateId.startsWith('chart-gauge-') || !Array.isArray(props.data)) return [];
  const items = props.data.filter(isNameValueItem).slice(1);
  if (!items.length) return [];
  const colors = Array.isArray(style.value.seriesColors) ? style.value.seriesColors.map(String) : [];
  return items.map((item, index) => ({
    name: item.name,
    value: String(item.value),
    color: /故障|异常|告警|离线/.test(item.name)
      ? '#EF4444'
      : /运行|在线|正常/.test(item.name)
        ? '#22C55E'
        : /停机|停用|待机/.test(item.name)
          ? String(style.value.textColor ?? '#9FB3D1')
          : colors[index % Math.max(colors.length, 1)] ?? 'var(--pri)',
  }));
});
const pieSummaryItems = computed<PieSummaryItem[]>(() => {
  if (gaugeSummaryItems.value.length) return gaugeSummaryItems.value;
  if (!pieSummaryKind.value || !Array.isArray(props.data)) return [];
  const items = props.data.filter(isNameValueItem);
  const colors = Array.isArray(style.value.seriesColors) ? style.value.seriesColors.map(String) : [];
  if (pieSummaryKind.value === 'control') {
    const order = ['算法', '手动', 'PID'];
    return order.flatMap((name, index) => {
      const item = items.find((candidate) => candidate.name === name);
      return item ? [{ name, value: `${item.value}次`, color: colors[index] ?? 'var(--pri)' }] : [];
    });
  }
  const resolved = items.find((item) => item.name === '已解决');
  const unresolved = items.find((item) => item.name === '未解决');
  const total = Number(resolved?.value ?? 0) + Number(unresolved?.value ?? 0);
  const order = ['新增告警', '已解决', '未解决'];
  return order.flatMap((name) => {
    const item = items.find((candidate) => candidate.name === name);
    if (!item) return [];
    const colorIndex = name === '未解决' ? 1 : 0;
    const percent = name === '新增告警' || total <= 0
      ? undefined
      : `${Math.round(Number(item.value) / total * 100)}%`;
    return [{ name, value: `${item.value}条`, percent, color: colors[colorIndex] ?? 'var(--pri)' }];
  });
});
const panelStyle = computed(() => ({
  padding: style.value.boardEnabled ? `${Number(style.value.boardPadding ?? 0)}px` : '0',
  ...(style.value.boardEnabled ? {
    backgroundColor: String(style.value.boardBackgroundColor ?? 'var(--panel)'),
    borderColor: String(style.value.boardBorderColor ?? 'var(--border)'),
    borderWidth: `${Number(style.value.boardBorderWidth ?? 1)}px`,
    borderRadius: `${Number(style.value.boardRadius ?? 8)}px`,
  } : {}),
  '--component-title-color': String(style.value.boardTitleColor ?? 'var(--t1)'),
  '--component-title-size': `${Number(style.value.boardTitleSize ?? 16)}px`,
  '--component-title-accent': String(style.value.boardTitleAccentColor || 'transparent'),
  '--component-border-color': String(style.value.boardBorderColor ?? 'var(--border)'),
  '--component-text-color': String(style.value.textColor ?? 'var(--t2)'),
  '--component-value-color': String(style.value.valueColor ?? 'var(--t1)'),
}));
const hasTitleAccent = computed(() => Boolean(String(style.value.boardTitleAccentColor ?? '').trim()));

/** 销毁图表实例 */
function disposeChart(): void {
  observer?.disconnect();
  observer = null;
  chart?.dispose();
  chart = null;
}

/** 渲染 */
async function renderChart(): Promise<void> {
  await nextTick();
  if (!el.value) {
    return;
  }
  ensureEchartsThemes();
  if (!chart) {
    chart = echarts.init(el.value, echartsThemeName(props.doc.theme));
  }
  if (!valid.value) {
    chart.clear();
    return;
  }
  chart.setOption(
    buildChartOption({
      templateId: props.doc.templateId,
      style: style.value,
      data: props.data,
      protocol: tpl.value?.dataProtocol,
      componentWidth: props.doc.w,
      componentHeight: props.doc.h,
      pieSummaryKind: pieSummaryKind.value,
    }),
    true,
  );
  chart.resize();
}

onMounted(() => {
  void renderChart().then(() => {
    observer = new ResizeObserver(() => chart?.resize());
    if (el.value) {
      observer.observe(el.value);
    }
  });
});

onBeforeUnmount(() => {
  disposeChart();
});

watch(
  () => props.doc.theme,
  () => {
    disposeChart();
    void renderChart().then(() => {
      observer = new ResizeObserver(() => chart?.resize());
      if (el.value) {
        observer.observe(el.value);
      }
    });
  },
);

watch(
  () => [props.data, props.doc.style, props.doc.w, props.doc.h],
  () => void renderChart(),
  { deep: true },
);

function isNameValueItem(value: unknown): value is { name: string; value: number } {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).name === 'string'
    && typeof (value as Record<string, unknown>).value === 'number';
}
</script>

<template>
  <div class="wrap" :class="{ board: style.boardEnabled }" :style="panelStyle">
    <div v-if="style.boardEnabled && String(style.boardTitle ?? '').trim()" class="board-title" :class="{ 'board-title-accent': hasTitleAccent }">{{ style.boardTitle }}</div>
    <ComponentAccessories :style="style" :data="data" />
    <div v-if="!valid && mode === 'edit'" class="warn">静态数据不符合协议</div>
    <div v-else-if="!valid && mode === 'runtime'" class="fail">数据加载失败</div>
    <div class="chart-layout" :class="{ 'chart-layout-summary': pieSummaryItems.length }">
      <div ref="el" class="chart" />
      <div v-if="pieSummaryItems.length" class="pie-summary">
        <div v-for="item in pieSummaryItems" :key="item.name" class="pie-summary-row" :class="{ 'pie-summary-row-status': gaugeSummaryItems.length }">
          <i :style="{ backgroundColor: item.color }" />
          <span>{{ item.name }}</span>
          <b>{{ item.value }}</b>
          <em v-if="item.percent">{{ item.percent }}</em>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; box-sizing: border-box; }
.wrap.board { border-style: solid; }
.board-title { height: 40px; flex: none; display: flex; align-items: center; font-size: var(--component-title-size); font-weight: 600; color: var(--component-title-color); border-bottom: 1px solid var(--component-border-color, var(--border)); }
.board-title-accent::before { content: ''; flex: none; width: 3px; height: 0.9em; margin-right: 8px; border-radius: 1px; background: var(--component-title-accent); }
.chart-layout { flex: 1; min-height: 0; width: 100%; display: flex; }
.chart { flex: 1; min-width: 0; min-height: 0; width: 100%; }
.chart-layout-summary .chart { flex: 0 0 54%; }
.pie-summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 12px 20px 12px 6px;
  box-sizing: border-box;
}
.pie-summary-row {
  display: grid;
  grid-template-columns: 8px minmax(56px, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  color: var(--component-text-color);
  font-size: 12px;
}
.pie-summary-row i { width: 8px; height: 8px; border-radius: 50%; }
.pie-summary-row b { color: var(--component-value-color); font-family: var(--font-num); font-size: 18px; font-weight: 500; text-align: right; }
.pie-summary-row-status { gap: 8px; }
.pie-summary-row-status b { font-size: 15px; }
.pie-summary-row em { min-width: 40px; color: var(--component-text-color); font-family: var(--font-num); font-size: 16px; font-style: normal; text-align: right; }
.warn, .fail { position: absolute; top: 8px; right: 8px; font-size: 12px; padding: 2px 8px; border-radius: 4px; z-index: 2; }
.warn { background: rgba(245, 158, 11, .15); color: var(--warn); }
.fail { background: rgba(239, 68, 68, .15); color: var(--err); }
</style>
