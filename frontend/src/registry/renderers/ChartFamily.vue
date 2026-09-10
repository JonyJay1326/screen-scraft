<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { ComponentDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { buildChartOption } from '../chart-option';
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
