<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import type { ComponentDoc, EventDoc, ScreenDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { resolveComponentTemplate } from '../../registry';
import { fetchDataApi, fetchWeather } from '../../api/runtime';
import { calcFit } from '../../utils/fit';
import ComponentRenderer from './ComponentRenderer.vue';
import { RuntimeRequestScheduler } from './requestScheduler';

const props = defineProps<{
  screen: ScreenDoc;
  chrome: 'none' | 'display';
}>();

const emit = defineEmits<{ configure: [] }>();
const stage = ref<HTMLElement | null>(null);
const pageId = ref(props.screen.pages[0]?.id ?? '');
const fit = reactive({ scaleX: 1, scaleY: 1, left: 0, top: 0 });
const dataMap = reactive<Record<string, unknown>>({});
const failed = reactive<Record<string, boolean>>({});
const loading = reactive<Record<string, boolean>>({});
const hidden = reactive<Record<string, boolean>>({});
const renderReady = reactive<Record<string, boolean>>({});
const extraParams = reactive<Record<string, unknown>>({});
const barShow = ref(true);
let hideBarTimer: number | null = null;
let renderFrame: number | null = null;
let pageGeneration = 0;
const scheduler = new RuntimeRequestScheduler(6);
const pollTimers = new Map<string, number>();
const requestVersions = new Map<string, number>();
const requestKeysByComponent = new Map<string, string>();

const page = computed(() => props.screen.pages.find((item) => item.id === pageId.value) ?? props.screen.pages[0]);
const comps = computed(() => [...(page.value?.components ?? [])].sort((a, b) => a.zIndex - b.zIndex));
const canvasW = computed(() => props.screen.canvas?.width || 1920);
const canvasH = computed(() => props.screen.canvas?.height || 1080);

/** 适配缩放（transform-origin: left top，与 calcFit 坐标系一致） */
function applyFit(): void {
  if (!stage.value) {
    return;
  }
  const next = calcFit(
    props.screen.fitMode,
    stage.value.clientWidth,
    stage.value.clientHeight,
    canvasW.value,
    canvasH.value,
  );
  Object.assign(fit, next);
}

function clearReactiveRecord(record: Record<string, unknown>): void {
  Object.keys(record).forEach((key) => delete record[key]);
}

function isVisible(comp: ComponentDoc): boolean {
  return !comp.hidden && !hidden[comp.id];
}

function stableParams(): Record<string, unknown> {
  return Object.fromEntries(Object.keys(extraParams).sort().map((key) => [key, extraParams[key]]));
}

function getRequestKey(comp: ComponentDoc): string {
  if (comp.templateId.startsWith('weather-')) {
    const adcode = String(comp.data?.builtin?.adcode || comp.style.adcode || '330108');
    return `weather:${adcode}`;
  }
  return `api:${comp.data?.apiId ?? ''}:${JSON.stringify(stableParams())}`;
}

function getRefreshSeconds(comp: ComponentDoc): number {
  if (comp.templateId.startsWith('weather-')) {
    return 300;
  }
  return Math.max(5, Number(comp.data?.refreshSec ?? 30));
}

function scheduleNext(comp: ComponentDoc, generation: number): void {
  if (generation !== pageGeneration || !isVisible(comp)) {
    return;
  }
  const previous = pollTimers.get(comp.id);
  if (previous !== undefined) {
    clearTimeout(previous);
  }
  const jitter = 0.9 + Math.random() * 0.2;
  const timer = window.setTimeout(() => {
    pollTimers.delete(comp.id);
    void loadComp(comp);
  }, getRefreshSeconds(comp) * jitter * 1000);
  pollTimers.set(comp.id, timer);
}

function cancelComponent(compId: string): void {
  const timer = pollTimers.get(compId);
  if (timer !== undefined) {
    clearTimeout(timer);
    pollTimers.delete(compId);
  }
  const requestKey = requestKeysByComponent.get(compId);
  if (requestKey) {
    requestKeysByComponent.delete(compId);
    const stillNeeded = [...requestKeysByComponent.values()].includes(requestKey);
    if (!stillNeeded) {
      scheduler.cancel(requestKey);
    }
  }
  requestVersions.set(compId, (requestVersions.get(compId) ?? 0) + 1);
  loading[compId] = false;
}

/** 取数完成后再安排下一轮，避免慢请求叠加。 */
async function loadComp(comp: ComponentDoc): Promise<void> {
  const tpl = resolveComponentTemplate(comp);
  const isWeather = comp.templateId.startsWith('weather-');
  const isApi = comp.data?.source === 'api' && Boolean(comp.data.apiId);
  if (!isWeather && !isApi) {
    dataMap[comp.id] = comp.data?.staticData;
    failed[comp.id] = false;
    loading[comp.id] = false;
    return;
  }
  if (!isVisible(comp)) {
    return;
  }

  const generation = pageGeneration;
  const version = (requestVersions.get(comp.id) ?? 0) + 1;
  requestVersions.set(comp.id, version);
  const requestKey = getRequestKey(comp);
  requestKeysByComponent.set(comp.id, requestKey);
  if (!Object.prototype.hasOwnProperty.call(dataMap, comp.id)) {
    loading[comp.id] = true;
  }

  try {
    const params = stableParams();
    const raw = await scheduler.request(requestKey, (signal) => {
      if (isWeather) {
        const adcode = String(comp.data?.builtin?.adcode || comp.style.adcode || '330108');
        return fetchWeather(adcode, signal);
      }
      return fetchDataApi(comp.data?.apiId ?? '', params, signal);
    });
    if (generation !== pageGeneration || requestVersions.get(comp.id) !== version || !isVisible(comp)) {
      return;
    }
    dataMap[comp.id] = raw;
    failed[comp.id] = tpl ? !isProtocolValid(tpl.dataProtocol, raw) : false;
  } catch (error) {
    const canceled = (error as { name?: string; code?: string }).name === 'AbortError'
      || (error as { code?: string }).code === 'ERR_CANCELED';
    if (!canceled && generation === pageGeneration && requestVersions.get(comp.id) === version) {
      failed[comp.id] = true;
    }
  } finally {
    if (requestKeysByComponent.get(comp.id) === requestKey) {
      requestKeysByComponent.delete(comp.id);
    }
    if (generation === pageGeneration && requestVersions.get(comp.id) === version) {
      loading[comp.id] = false;
      scheduleNext(comp, generation);
    }
  }
}

/** 分帧挂载组件，降低几十个图表同时初始化造成的主线程尖峰。 */
function startProgressiveRender(items: ComponentDoc[]): void {
  if (renderFrame !== null) {
    cancelAnimationFrame(renderFrame);
  }
  clearReactiveRecord(renderReady);
  const queue = items.filter(isVisible);
  const revealBatch = (): void => {
    queue.splice(0, 4).forEach((comp) => {
      renderReady[comp.id] = true;
    });
    renderFrame = queue.length > 0 ? requestAnimationFrame(revealBatch) : null;
  };
  revealBatch();
}

/** 当前页集中排队取数。 */
function bindPage(): void {
  pageGeneration += 1;
  clearRuntimeTasks();
  clearReactiveRecord(extraParams);
  clearReactiveRecord(dataMap);
  clearReactiveRecord(failed);
  clearReactiveRecord(loading);
  startProgressiveRender(comps.value);
  comps.value.filter(isVisible).forEach((comp) => void loadComp(comp));
}

/** 清理轮询、排队中与进行中的请求。 */
function clearRuntimeTasks(): void {
  pollTimers.forEach((timer) => clearTimeout(timer));
  pollTimers.clear();
  scheduler.cancelAll();
  requestKeysByComponent.clear();
  requestVersions.clear();
}

/** 运行时事件 */
function runEvent(comp: ComponentDoc, trigger: EventDoc['trigger'], extra?: string): void {
  comp.events
    .filter((ev) => ev.trigger === trigger)
    .forEach((ev) => {
      if (ev.action === 'jumpPage' && ev.config.pageId) {
        pageId.value = ev.config.pageId;
      } else if (ev.action === 'jumpLink' && ev.config.url) {
        if (ev.config.openMode === 'current') {
          window.location.assign(ev.config.url);
        } else {
          window.open(ev.config.url, '_blank');
        }
      } else if (ev.action === 'toggleVisibility') {
        (ev.config.targets ?? []).forEach((t) => {
          const cur = hidden[t.componentId] ?? false;
          hidden[t.componentId] = t.state === 'show' ? false : t.state === 'hide' ? true : !cur;
          const target = comps.value.find((item) => item.id === t.componentId);
          if (target && hidden[t.componentId]) {
            cancelComponent(target.id);
          } else if (target) {
            renderReady[target.id] = true;
            void loadComp(target);
          }
        });
      } else if (ev.action === 'callApi') {
        if (extra !== undefined && String(comp.style.paramName || '')) {
          extraParams[String(comp.style.paramName)] = extra;
        }
        (ev.config.targetComponentIds ?? []).forEach((id) => {
          const target = comps.value.find((item) => item.id === id);
          if (target) {
            cancelComponent(target.id);
            void loadComp(target);
          }
        });
      }
    });
}

/** 截图 */
async function shot(): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = document.querySelector('.stage-inner') as HTMLElement | null;
  if (!canvas) {
    return;
  }
  const pic = await html2canvas(canvas, { backgroundColor: '#0D1730', scale: 0.4 });
  const a = document.createElement('a');
  a.href = pic.toDataURL('image/png');
  a.download = `${props.screen.name}.png`;
  a.click();
}

/** 全屏 */
function toggleFs(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void stage.value?.requestFullscreen();
  }
}

/** 控制条淡出 */
function bumpBar(): void {
  barShow.value = true;
  if (hideBarTimer) {
    clearTimeout(hideBarTimer);
  }
  hideBarTimer = window.setTimeout(() => {
    barShow.value = false;
  }, 3000);
}

onMounted(async () => {
  await nextTick();
  applyFit();
  bindPage();
  window.addEventListener('resize', applyFit);
  bumpBar();
});
onUnmounted(() => {
  window.removeEventListener('resize', applyFit);
  pageGeneration += 1;
  clearRuntimeTasks();
  if (renderFrame !== null) {
    cancelAnimationFrame(renderFrame);
  }
  if (hideBarTimer) {
    clearTimeout(hideBarTimer);
  }
});
watch(pageId, () => bindPage());
watch(
  () => [props.screen.fitMode, canvasW.value, canvasH.value] as const,
  () => {
    void nextTick().then(applyFit);
  },
);
</script>

<template>
  <div ref="stage" class="stage" @mousemove="chrome === 'display' && bumpBar()">
    <div
      class="stage-inner"
      :style="{
        width: canvasW + 'px',
        height: canvasH + 'px',
        left: fit.left + 'px',
        top: fit.top + 'px',
        transform: `scale(${fit.scaleX}, ${fit.scaleY})`,
        transformOrigin: 'left top',
        background: page?.background.color || '#0D1730',
      }"
    >
      <template v-for="comp in comps" :key="comp.id">
        <div
          v-if="!comp.hidden && !hidden[comp.id]"
          class="rt-item"
          :data-comp-id="comp.id"
          :data-template="comp.templateId"
          :style="{ left: comp.x + 'px', top: comp.y + 'px', width: comp.w + 'px', height: comp.h + 'px', zIndex: comp.zIndex }"
          @click="runEvent(comp, 'click')"
          @dblclick="runEvent(comp, 'dblclick')"
          @mouseenter="runEvent(comp, 'mouseenter')"
          @mouseleave="runEvent(comp, 'mouseleave')"
        >
          <ComponentRenderer
            v-if="renderReady[comp.id]"
            :doc="comp"
            mode="runtime"
            :runtime-data="failed[comp.id] ? undefined : dataMap[comp.id]"
            :load-failed="failed[comp.id]"
            :loading="loading[comp.id]"
            @change="(v: string) => runEvent(comp, 'change', v)"
          />
          <div v-else class="render-wait">组件加载中…</div>
        </div>
      </template>
    </div>
    <div v-if="chrome === 'display'" class="ctrl-bar" :class="{ show: barShow }">
      <button class="ctrl-btn" type="button" @click="shot">截图</button>
      <button class="ctrl-btn" type="button" @click="emit('configure')">大屏配置</button>
      <button class="ctrl-btn" type="button" @click="toggleFs">全屏</button>
    </div>
  </div>
</template>

<style scoped>
.rt-item { position: absolute; }
.render-wait {
  width: 100%; height: 100%; display: grid; place-items: center;
  color: var(--t2); background: color-mix(in srgb, var(--pri) 8%, transparent);
}
.ctrl-bar.show { opacity: 1; }
.stage-inner {
  position: absolute;
  transform-origin: left top;
}
</style>
