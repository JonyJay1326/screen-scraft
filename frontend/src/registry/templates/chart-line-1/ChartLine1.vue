<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { AxisData, ComponentDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { chartLine1Template } from './meta';

const props = defineProps<{
  doc: ComponentDoc;
  data: unknown;
  mode: 'edit' | 'runtime';
}>();

const el = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;

const style = computed(() => {
  const defaults = chartLine1Template.defaultStyle[props.doc.theme];
  return { ...defaults, ...props.doc.style };
});

const valid = computed(() => isProtocolValid('axis', props.data));

/** 初始化图表 */
function renderChart(): void {
  if (!el.value) {
    return;
  }
  if (!chart) {
    chart = echarts.init(el.value, props.doc.theme === 'light' ? 'ds-light' : 'ds-dark');
  }
  if (!valid.value) {
    chart.clear();
    return;
  }
  const data = props.data as AxisData;
  const colors = (style.value.seriesColors as string[]) ?? [];
  const legendPos = String(style.value.legendPosition);
  const legend =
    legendPos === 'topRight'
      ? { top: 8, right: 12 }
      : legendPos === 'bottom'
        ? { bottom: 0, left: 'center' }
        : { top: 8, left: 'center' };
  chart.setOption(
    {
      color: colors,
      legend: { show: Boolean(style.value.showLegend), textStyle: { color: style.value.axisLabelColor }, ...legend },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.categories,
        show: Boolean(style.value.showXAxis),
        axisLabel: { color: String(style.value.axisLabelColor) },
        axisLine: { lineStyle: { color: '#1E3A66' } },
      },
      yAxis: {
        type: 'value',
        show: Boolean(style.value.showYAxis),
        axisLabel: { color: String(style.value.axisLabelColor) },
        splitLine: { lineStyle: { color: String(style.value.gridColor), type: 'dashed' } },
      },
      series: data.series.map((serie, index) => ({
        name: serie.name,
        type: 'line',
        smooth: Boolean(style.value.lineSmooth),
        symbol: style.value.showSymbol ? 'circle' : 'none',
        lineStyle: { width: Number(style.value.lineWidth) },
        label: { show: Boolean(style.value.showLabel) },
        areaStyle:
          Number(style.value.areaOpacity) > 0
            ? { opacity: Number(style.value.areaOpacity) / 100, color: colors[index] }
            : undefined,
        data: serie.data,
      })),
    },
    true,
  );
}

onMounted(() => {
  registerThemes();
  renderChart();
  observer = new ResizeObserver(() => chart?.resize());
  if (el.value) {
    observer.observe(el.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
  chart = null;
});

watch(() => [props.data, props.doc.style, props.doc.theme], () => renderChart(), { deep: true });

/** 注册 ECharts 主题包 */
function registerThemes(): void {
  echarts.registerTheme('ds-dark', { backgroundColor: 'transparent' });
  echarts.registerTheme('ds-light', { backgroundColor: 'transparent' });
}
</script>

<template>
  <div class="line-wrap" :class="{ board: style.boardEnabled }" :style="{ padding: style.boardEnabled ? style.boardPadding + 'px' : '0' }">
    <div v-if="style.boardEnabled" class="board-title">{{ style.boardTitle }}</div>
    <div v-if="!valid && mode === 'edit'" class="warn">静态数据不符合协议</div>
    <div v-else-if="!valid && mode === 'runtime'" class="fail">数据加载失败</div>
    <div ref="el" class="chart" />
  </div>
</template>

<style scoped>
.line-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; background: transparent; }
.line-wrap.board { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; }
.board-title {
  height: 40px; display: flex; align-items: center; font-size: 16px; font-weight: 600; color: var(--t1);
  border-bottom: 1px solid var(--border);
}
.chart { flex: 1; min-height: 0; }
.warn, .fail { position: absolute; top: 8px; right: 8px; font-size: 12px; padding: 2px 8px; border-radius: 4px; z-index: 2; }
.warn { background: rgba(245, 158, 11, .15); color: var(--warn); }
.fail { background: rgba(239, 68, 68, .15); color: var(--err); }
</style>
