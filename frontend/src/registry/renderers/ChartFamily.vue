<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { AxisData, ComboData, ComponentDoc, NameValueData, RadarData } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { getMeta } from '../meta-lookup';
import { ensureEchartsThemes, echartsThemeName } from '../../theme/echarts-theme';

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
const family = computed(() => props.doc.templateId.split('-')[1] ?? 'bar');

/** 图例位置 */
function legendOf() {
  const pos = String(style.value.legendPosition);
  if (pos === 'topRight') {
    return { top: 8, right: 12 };
  }
  if (pos === 'bottom') {
    return { bottom: 0, left: 'center' };
  }
  return { top: 8, left: 'center' };
}

/** 组装 option */
function buildOption(): echarts.EChartsCoreOption {
  const colors = (style.value.seriesColors as string[]) ?? [];
  const common = {
    color: colors,
    legend: { show: Boolean(style.value.showLegend), textStyle: { color: style.value.axisLabelColor }, ...legendOf() },
    tooltip: { trigger: family.value === 'pie' || family.value === 'funnel' ? 'item' : 'axis' },
  };
  if (family.value === 'line' || family.value === 'bar') {
    const data = props.data as AxisData;
    const isBar = family.value === 'bar';
    const horizontal = Boolean(style.value.horizontal);
    const catAxis = {
      type: 'category' as const,
      data: data.categories,
      show: Boolean(style.value.showXAxis),
      axisLabel: { color: String(style.value.axisLabelColor) },
    };
    const valAxis = {
      type: 'value' as const,
      show: Boolean(style.value.showYAxis),
      axisLabel: { color: String(style.value.axisLabelColor) },
      splitLine: { lineStyle: { color: String(style.value.gridColor), type: 'dashed' as const } },
    };
    return {
      ...common,
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: data.series.map((serie) => ({
        name: serie.name,
        type: isBar ? 'bar' : 'line',
        stack: style.value.stack ? 'total' : undefined,
        smooth: Boolean(style.value.lineSmooth),
        symbol: style.value.showSymbol ? 'circle' : 'none',
        barWidth: style.value.barWidth ? `${style.value.barWidth}%` : undefined,
        barGap: style.value.barGap ? `${style.value.barGap}%` : undefined,
        lineStyle: { width: Number(style.value.lineWidth ?? 2) },
        label: { show: Boolean(style.value.showLabel) },
        areaStyle:
          !isBar && Number(style.value.areaOpacity) > 0
            ? { opacity: Number(style.value.areaOpacity) / 100 }
            : undefined,
        data: serie.data,
      })),
    };
  }
  if (family.value === 'combo') {
    const data = props.data as ComboData;
    return {
      ...common,
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: { type: 'category', data: data.categories, show: Boolean(style.value.showXAxis), axisLabel: { color: String(style.value.axisLabelColor) } },
      yAxis: [
        { type: 'value', show: Boolean(style.value.showYAxis), axisLabel: { color: String(style.value.axisLabelColor) }, splitLine: { lineStyle: { color: String(style.value.gridColor), type: 'dashed' } } },
        { type: 'value', show: Boolean(style.value.showYAxis), splitLine: { show: false } },
      ],
      series: data.series.map((serie) => ({
        name: serie.name,
        type: serie.type,
        yAxisIndex: serie.yAxisIndex ?? 0,
        smooth: Boolean(style.value.lineSmooth),
        barWidth: style.value.barWidth ? `${style.value.barWidth}%` : undefined,
        data: serie.data,
      })),
    };
  }
  if (family.value === 'pie') {
    const data = props.data as NameValueData;
    const inner = Number(style.value.innerRadius ?? 0);
    return {
      ...common,
      series: [
        {
          type: 'pie',
          radius: inner > 0 ? [`${inner}%`, '70%'] : '70%',
          roseType: style.value.roseType ? 'radius' : undefined,
          label: { show: Boolean(style.value.showLabel), color: String(style.value.axisLabelColor) },
          data,
        },
      ],
      graphic: style.value.showCenter
        ? [{ type: 'text', left: 'center', top: 'middle', style: { text: String(style.value.centerText ?? ''), fill: String(style.value.axisLabelColor), fontSize: 14 } }]
        : undefined,
    };
  }
  if (family.value === 'funnel') {
    const data = props.data as NameValueData;
    return {
      ...common,
      series: [{ type: 'funnel', data, label: { show: Boolean(style.value.showLabel) }, sort: 'descending' }],
    };
  }
  if (family.value === 'radar') {
    const data = props.data as RadarData;
    return {
      ...common,
      radar: { indicator: data.indicators, axisName: { color: String(style.value.axisLabelColor) } },
      series: data.series.map((serie) => ({
        type: 'radar',
        name: serie.name,
        areaStyle: Number(style.value.areaOpacity) > 0 ? { opacity: Number(style.value.areaOpacity) / 100 } : undefined,
        data: [{ value: serie.data, name: serie.name }],
      })),
    };
  }
  const nv = (props.data as NameValueData) ?? [];
  const value = nv[0]?.value ?? 0;
  return {
    ...common,
    series: [
      {
        type: 'gauge',
        min: Number(style.value.gaugeMin ?? 0),
        max: Number(style.value.gaugeMax ?? 100),
        detail: { formatter: '{value}', color: String(style.value.axisLabelColor) },
        data: [{ value, name: nv[0]?.name ?? '' }],
      },
    ],
  };
}

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
  chart.setOption(buildOption(), true);
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
</script>

<template>
  <div class="wrap" :class="{ board: style.boardEnabled }" :style="{ padding: style.boardEnabled ? style.boardPadding + 'px' : '0' }">
    <div v-if="style.boardEnabled" class="board-title">{{ style.boardTitle }}</div>
    <div v-if="!valid && mode === 'edit'" class="warn">静态数据不符合协议</div>
    <div v-else-if="!valid && mode === 'runtime'" class="fail">数据加载失败</div>
    <div ref="el" class="chart" />
  </div>
</template>

<style scoped>
.wrap { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; box-sizing: border-box; }
.wrap.board { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; }
.board-title { height: 40px; flex: none; display: flex; align-items: center; font-size: 16px; font-weight: 600; color: var(--t1); border-bottom: 1px solid var(--border); }
.chart { flex: 1; min-height: 0; width: 100%; }
.warn, .fail { position: absolute; top: 8px; right: 8px; font-size: 12px; padding: 2px 8px; border-radius: 4px; z-index: 2; }
.warn { background: rgba(245, 158, 11, .15); color: var(--warn); }
.fail { background: rgba(239, 68, 68, .15); color: var(--err); }
</style>
