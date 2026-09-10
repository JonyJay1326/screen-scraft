<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import {
  isProtocolValid,
  validateComponentDefinitionSnapshot,
  type ComponentDoc,
} from '@screencraft/shared';
import { ensureEchartsThemes, echartsThemeName } from '../../theme/echarts-theme';
import { buildSafeChartOption } from '../safe-chart-option';

const props = defineProps<{
  doc: ComponentDoc;
  data: unknown;
  mode: 'edit' | 'runtime';
}>();

const el = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;

const definitionValid = computed(() => Boolean(
  props.doc.definitionSnapshot
  && props.doc.definitionSnapshot.rendererKey === 'echarts-safe-v1'
  && validateComponentDefinitionSnapshot(props.doc.definitionSnapshot).length === 0,
));
const dataValid = computed(() => Boolean(
  definitionValid.value
  && isProtocolValid(props.doc.definitionSnapshot?.dataProtocol, props.data),
));

function disposeChart(): void {
  observer?.disconnect();
  observer = null;
  chart?.dispose();
  chart = null;
}

async function renderChart(): Promise<void> {
  await nextTick();
  if (!el.value) {
    return;
  }
  if (!definitionValid.value) {
    chart?.clear();
    return;
  }
  ensureEchartsThemes();
  if (!chart) {
    chart = echarts.init(el.value, echartsThemeName(props.doc.theme));
  }
  if (!dataValid.value) {
    chart.clear();
    return;
  }
  chart.setOption(buildSafeChartOption(props.doc, props.data), true);
  chart.resize();
}

function bindObserver(): void {
  observer?.disconnect();
  if (el.value) {
    observer = new ResizeObserver(() => chart?.resize());
    observer.observe(el.value);
  }
}

onMounted(() => void renderChart().then(bindObserver));
onBeforeUnmount(disposeChart);
watch(
  () => [props.data, props.doc.style, props.doc.definitionSnapshot, props.doc.w, props.doc.h],
  () => void renderChart(),
  { deep: true },
);
watch(() => props.doc.theme, () => {
  disposeChart();
  void renderChart().then(bindObserver);
});
</script>

<template>
  <div class="safe-chart">
    <div v-if="!definitionValid" class="state error">组件配置不可用</div>
    <div v-else-if="!dataValid" class="state" :class="mode === 'edit' ? 'warning' : 'error'">
      {{ mode === 'edit' ? '静态数据不符合协议' : '数据加载失败' }}
    </div>
    <div ref="el" class="chart" />
  </div>
</template>

<style scoped>
.safe-chart, .chart { width: 100%; height: 100%; }
.safe-chart { position: relative; }
.state { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; font-size: 12px; }
.warning { color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); }
.error { color: var(--err); background: color-mix(in srgb, var(--err) 10%, transparent); }
</style>
