<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ComponentDoc, TencentWeatherData } from '@screencraft/shared';
import { fetchWeather } from '../../api/runtime';
import { getMeta } from '../meta-lookup';
import { weatherEmoji } from '../weather-emoji';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const clock = ref('');
const live = ref<TencentWeatherData | null>(null);
const loading = ref(false);
const loadFailed = ref(false);
let clockTimer: number | null = null;
let pollTimer: number | null = null;

const adcode = computed(() =>
  String(props.doc.data?.builtin?.adcode || style.value.adcode || '330108'),
);

const weather = computed(() => {
  const fromProp = props.data as TencentWeatherData | undefined;
  return fromProp?.result?.realtime?.[0] ?? live.value?.result?.realtime?.[0];
});

const compact = computed(() => props.doc.templateId === 'weather-1');

/** 当前天气对应 emoji */
const emoji = computed(() => weatherEmoji(weather.value?.infos?.weather ?? ''));

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

/** 拉取内置天气（编辑态自行取数，画布显示真实画面） */
async function loadWeather(): Promise<void> {
  loading.value = true;
  try {
    live.value = await fetchWeather(adcode.value);
    loadFailed.value = false;
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

/** 启动/重置编辑态轮询 */
function bindPoll(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (props.mode === 'edit') {
    void loadWeather();
    pollTimer = window.setInterval(() => void loadWeather(), 300000);
  }
}

onMounted(() => {
  tick();
  clockTimer = window.setInterval(tick, 1000);
  bindPoll();
});

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer);
  }
  if (pollTimer) {
    clearInterval(pollTimer);
  }
});

watch(adcode, () => {
  if (props.mode === 'edit') {
    void loadWeather();
  }
});

watch(
  () => props.mode,
  () => bindPoll(),
);
</script>

<template>
  <div
    class="wx"
    :class="[compact ? 'wx-compact' : 'wx-card', { board: style.boardEnabled }]"
    :style="{ padding: (style.boardEnabled ? Number(style.boardPadding || 12) : 12) + 'px' }"
  >
    <div v-if="style.boardEnabled && style.boardTitle" class="board-title">{{ style.boardTitle }}</div>
    <div class="wx-body">
      <template v-if="weather">
        <div class="wx-emoji" :class="{ lg: !compact }" :title="weather.infos.weather">{{ emoji }}</div>
        <div v-if="!compact" class="wx-temp">{{ weather.infos.temperature }}°</div>
        <div class="wx-main">
          <b>
            <template v-if="compact">{{ weather.city }} · {{ weather.infos.weather }} {{ weather.infos.temperature }}°C</template>
            <template v-else>{{ weather.city }} · {{ weather.infos.weather }}</template>
          </b>
          <span>湿度 {{ weather.infos.humidity }}% · AQI {{ weather.air?.aqi ?? '-' }} · {{ clock }}</span>
        </div>
      </template>
      <div v-else-if="loading || mode === 'runtime'" class="muted">天气加载中…</div>
      <div v-else class="fail">数据加载失败</div>
    </div>
  </div>
</template>

<style scoped>
.wx {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  color: var(--acc);
}
.wx.board {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.board-title {
  flex: none;
  font-size: 12px;
  line-height: 1.2;
  color: var(--t2);
}
.wx-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.wx-emoji {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 28px;
  line-height: 1;
  /* 抵消部分 emoji 字形偏下的视觉误差 */
  transform: translateY(1px);
  user-select: none;
}
.wx-emoji.lg {
  width: 48px;
  height: 40px;
  font-size: 38px;
  transform: translateY(0);
}
.wx-temp {
  flex: none;
  display: inline-flex;
  align-items: center;
  font-family: var(--font-num);
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  height: 40px;
  color: var(--t1);
  min-width: 64px;
}
.wx-main {
  flex: 1;
  min-width: 0;
}
.wx-main b {
  display: block;
  color: var(--t1);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 4px;
}
.wx-compact .wx-main b {
  font-size: 15px;
}
.wx-main span {
  font-size: 12px;
  color: var(--t2);
  line-height: 1.3;
}
.muted {
  color: var(--t2);
  font-size: 13px;
}
.fail {
  color: var(--err);
  font-size: 12px;
}
</style>
