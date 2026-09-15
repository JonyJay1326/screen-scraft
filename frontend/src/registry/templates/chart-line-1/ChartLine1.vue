<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { ComponentDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { chartLine1Template } from './meta';
import { buildChartOption } from '../../chart-option';
import { ensureEchartsThemes, echartsThemeName } from '../../../theme/echarts-theme';
import ComponentAccessories from '../../renderers/ComponentAccessories.vue';

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
  '--component-border-color': String(style.value.boardBorderColor ?? 'var(--border)'),
  '--component-text-color': String(style.value.textColor ?? 'var(--t2)'),
  '--component-value-color': String(style.value.valueColor ?? 'var(--t1)'),
}));

/** 销毁并重建实例（主题切换必须重建） */
function disposeChart(): void {
  observer?.disconnect();
  observer = null;
  chart?.dispose();
  chart = null;
}

/** 初始化或刷新折线图 */
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
      templateId: chartLine1Template.id,
      style: style.value,
      data: props.data,
      protocol: 'axis',
    }),
    true,
  );
  chart.resize();
}

/** 监听容器尺寸变化 */
function bindObserver(): void {
  observer?.disconnect();
  if (!el.value) {
    return;
  }
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(el.value);
}

onMounted(() => {
  void renderChart().then(() => bindObserver());
});

onBeforeUnmount(() => {
  disposeChart();
});

watch(
  () => [props.data, props.doc.style, props.doc.w, props.doc.h],
  () => {
    void renderChart();
  },
  { deep: true },
);

watch(
  () => props.doc.theme,
  () => {
    disposeChart();
    void renderChart().then(() => bindObserver());
  },
);
</script>

<template>
  <div
    class="line-wrap"
    :class="{ board: style.boardEnabled }"
    :style="panelStyle"
  >
    <div v-if="style.boardEnabled" class="board-title">{{ style.boardTitle }}</div>
    <ComponentAccessories :style="style" :data="data" />
    <div v-if="!valid && mode === 'edit'" class="warn">静态数据不符合协议</div>
    <div v-else-if="!valid && mode === 'runtime'" class="fail">数据加载失败</div>
    <div ref="el" class="chart" />
  </div>
</template>

<style scoped>
.line-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  box-sizing: border-box;
}
.line-wrap.board { border-style: solid; }
.board-title {
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  font-size: var(--component-title-size);
  font-weight: 600;
  color: var(--component-title-color);
  border-bottom: 1px solid var(--component-border-color, var(--border));
}
.chart {
  flex: 1;
  min-height: 0;
  width: 100%;
}
.warn,
.fail {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  z-index: 2;
}
.warn {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warn);
}
.fail {
  background: rgba(239, 68, 68, 0.15);
  color: var(--err);
}
</style>
