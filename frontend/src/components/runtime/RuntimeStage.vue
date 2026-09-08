<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import type { ComponentDoc, EventDoc, ScreenDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { getTemplate } from '../../registry';
import { fetchDataApi, fetchWeather } from '../../api/runtime';
import { calcFit } from '../../utils/fit';
import ComponentRenderer from './ComponentRenderer.vue';

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
const hidden = reactive<Record<string, boolean>>({});
const extraParams = reactive<Record<string, unknown>>({});
const barShow = ref(true);
let hideBarTimer: number | null = null;
const timers: number[] = [];

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

/** 取数 */
async function loadComp(comp: ComponentDoc): Promise<void> {
  const tpl = getTemplate(comp.templateId);
  if (comp.templateId.startsWith('weather-')) {
    const adcode = String(comp.data?.builtin?.adcode || comp.style.adcode || '330108');
    try {
      dataMap[comp.id] = await fetchWeather(adcode);
      failed[comp.id] = !isProtocolValid('weather', dataMap[comp.id]);
    } catch {
      failed[comp.id] = true;
    }
    return;
  }
  if (comp.data?.source === 'api' && comp.data.apiId) {
    try {
      const raw = await fetchDataApi(comp.data.apiId, extraParams);
      dataMap[comp.id] = raw;
      failed[comp.id] = tpl ? !isProtocolValid(tpl.dataProtocol, raw) : false;
    } catch {
      failed[comp.id] = true;
    }
    return;
  }
  dataMap[comp.id] = comp.data?.staticData;
  failed[comp.id] = false;
}

/** 当前页全部取数并设置轮询 */
function bindPage(): void {
  clearTimers();
  Object.keys(extraParams).forEach((key) => {
    delete extraParams[key];
  });
  comps.value.forEach((comp) => {
    void loadComp(comp);
    if (comp.templateId.startsWith('weather-')) {
      timers.push(window.setInterval(() => void loadComp(comp), 300000));
    } else if (comp.data?.source === 'api') {
      const sec = Math.max(5, Number(comp.data.refreshSec || 5));
      timers.push(window.setInterval(() => void loadComp(comp), sec * 1000));
    }
  });
}

/** 清轮询 */
function clearTimers(): void {
  timers.splice(0).forEach((id) => clearInterval(id));
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
        });
      } else if (ev.action === 'callApi') {
        if (extra !== undefined && String(comp.style.paramName || '')) {
          extraParams[String(comp.style.paramName)] = extra;
        }
        (ev.config.targetComponentIds ?? []).forEach((id) => {
          const target = comps.value.find((item) => item.id === id);
          if (target) {
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
  clearTimers();
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
            :doc="comp"
            mode="runtime"
            :runtime-data="failed[comp.id] ? undefined : dataMap[comp.id]"
            :load-failed="failed[comp.id]"
            @change="(v: string) => runEvent(comp, 'change', v)"
          />
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
.ctrl-bar.show { opacity: 1; }
.stage-inner {
  position: absolute;
  transform-origin: left top;
}
</style>
