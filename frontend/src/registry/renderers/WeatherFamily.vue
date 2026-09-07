<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { ComponentDoc, TencentWeatherData } from '@screencraft/shared';
import { getMeta } from '../meta-lookup';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const clock = ref('');
let timer: number | null = null;

const weather = computed(() => {
  const raw = props.data as TencentWeatherData | undefined;
  return raw?.result?.realtime?.[0];
});

/** 本地时钟 */
function tick(): void {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = String(style.value.timeFormat || 'HH:mm');
  clock.value = fmt
    .replace('YYYY', String(now.getFullYear()))
    .replace('MM', pad(now.getMonth() + 1))
    .replace('DD', pad(now.getDate()))
    .replace('HH', pad(now.getHours()))
    .replace('mm', pad(now.getMinutes()))
    .replace('ss', pad(now.getSeconds()));
}

onMounted(() => {
  tick();
  timer = window.setInterval(tick, 1000);
});
onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div class="wx" :class="['w-' + doc.templateId, { board: style.boardEnabled }]">
    <template v-if="weather">
      <div class="wx-main">
        <b>{{ weather.city }} · {{ weather.infos.weather }} {{ weather.infos.temperature }}°C</b>
        <span>湿度 {{ weather.infos.humidity }}% · AQI {{ weather.air?.aqi ?? '-' }} · {{ clock }}</span>
      </div>
    </template>
    <div v-else-if="mode === 'runtime'" class="fail">数据加载失败</div>
    <div v-else class="wx-main">
      <b>天气组件 · adcode {{ style.adcode }}</b>
      <span>运行时请求内置天气接口 · {{ clock }}</span>
    </div>
  </div>
</template>

<style scoped>
.wx { width: 100%; height: 100%; display: flex; align-items: center; padding: 0 16px; box-sizing: border-box; color: var(--acc); }
.wx.board { background: rgba(22,41,78,.55); border: 1px solid rgba(53,114,200,.35); border-radius: 8px; }
.wx-main b { display: block; color: var(--t1); font-size: 14px; }
.wx-main span { font-size: 11px; color: var(--t2); }
.fail { color: var(--err); font-size: 12px; }
</style>
