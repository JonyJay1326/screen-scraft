<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  validateComponentDefinitionSnapshot,
  type ComponentDoc,
} from '@screencraft/shared';
import { borderTitleGeometry, buildSafeBorderGeometry } from '../safe-border-geometry';
import { resolveSafeBorderStyle } from '../safe-border-style';

const props = defineProps<{
  doc: ComponentDoc;
  data: unknown;
  mode: 'edit' | 'runtime';
}>();

const root = ref<HTMLDivElement | null>(null);
const width = ref(1);
const height = ref(1);
let observer: ResizeObserver | null = null;

const definitionValid = computed(() => Boolean(
  props.doc.definitionSnapshot
  && props.doc.definitionSnapshot.rendererKey === 'border-parametric-v1'
  && validateComponentDefinitionSnapshot(props.doc.definitionSnapshot).length === 0,
));
const style = computed(() => resolveSafeBorderStyle(props.doc));
const geometry = computed(() => buildSafeBorderGeometry(
  width.value,
  height.value,
  style.value.cornerSize,
  style.value.contentPadding,
  style.value.cornerType,
));
const titleGeometry = computed(() => borderTitleGeometry(
  geometry.value.width,
  geometry.value.corner,
  style.value.titlePosition,
));
const viewBox = computed(() => `0 0 ${geometry.value.width} ${geometry.value.height}`);
const cssVariables = computed<Record<string, string>>(() => ({
  '--safe-border-primary': style.value.primaryColor,
  '--safe-border-accent': style.value.accentColor,
  '--safe-border-background': style.value.backgroundColor,
  '--safe-border-line-width': String(style.value.lineWidth),
  '--safe-border-line-opacity': String(style.value.lineOpacity),
  '--safe-border-inner-glow': `${style.value.innerGlow}px`,
  '--safe-border-outer-glow': `${style.value.outerGlow}px`,
  '--safe-border-glow-opacity': String(style.value.glowOpacity),
}));

function measure(): void {
  const rect = root.value?.getBoundingClientRect();
  if (!rect) {
    return;
  }
  width.value = Math.max(1, rect.width);
  height.value = Math.max(1, rect.height);
}

onMounted(() => {
  measure();
  if (root.value) {
    observer = new ResizeObserver(measure);
    observer.observe(root.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());
watch(() => [props.doc.w, props.doc.h], measure);
</script>

<template>
  <div ref="root" class="safe-border" :style="cssVariables">
    <div v-if="!definitionValid" class="safe-border__error">组件配置不可用</div>
    <svg
      v-else
      class="safe-border__svg"
      :viewBox="viewBox"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon class="safe-border__outer-glow" :points="geometry.framePoints" vector-effect="non-scaling-stroke" />
      <polygon class="safe-border__inner-glow" :points="geometry.framePoints" vector-effect="non-scaling-stroke" />
      <polygon class="safe-border__frame" :points="geometry.framePoints" vector-effect="non-scaling-stroke" />
      <rect
        v-if="geometry.innerFrame"
        class="safe-border__inner-frame"
        :x="geometry.innerFrame.x"
        :y="geometry.innerFrame.y"
        :width="geometry.innerFrame.width"
        :height="geometry.innerFrame.height"
        vector-effect="non-scaling-stroke"
      />
      <polyline
        v-for="(points, index) in geometry.cornerMarks"
        :key="index"
        class="safe-border__corner"
        :points="points"
        vector-effect="non-scaling-stroke"
      />
      <text
        v-if="style.titlePosition !== 'none'"
        class="safe-border__title"
        :x="titleGeometry.x"
        :y="titleGeometry.y"
        :text-anchor="titleGeometry.anchor"
      >{{ doc.name }}</text>
    </svg>
  </div>
</template>

<style scoped>
.safe-border,
.safe-border__svg {
  width: 100%;
  height: 100%;
}
.safe-border {
  position: relative;
}
.safe-border__svg {
  display: block;
  overflow: visible;
}
.safe-border__frame,
.safe-border__outer-glow,
.safe-border__inner-glow,
.safe-border__inner-frame,
.safe-border__corner {
  stroke-linecap: square;
  stroke-linejoin: miter;
}
.safe-border__frame {
  fill: var(--safe-border-background);
  stroke: var(--safe-border-primary);
  stroke-width: var(--safe-border-line-width);
  stroke-opacity: var(--safe-border-line-opacity);
}
.safe-border__outer-glow,
.safe-border__inner-glow {
  fill: none;
  stroke: var(--safe-border-accent);
  pointer-events: none;
  opacity: var(--safe-border-glow-opacity);
}
.safe-border__outer-glow {
  stroke-width: var(--safe-border-line-width);
  filter: blur(var(--safe-border-outer-glow));
}
.safe-border__inner-glow {
  stroke-width: calc(var(--safe-border-line-width) + 1px);
  filter: blur(var(--safe-border-inner-glow));
}
.safe-border__corner {
  fill: none;
  stroke: var(--safe-border-accent);
  stroke-width: calc(var(--safe-border-line-width) + 1px);
  stroke-opacity: var(--safe-border-line-opacity);
}
.safe-border__inner-frame {
  fill: none;
  stroke: var(--safe-border-primary);
  stroke-width: max(1px, calc(var(--safe-border-line-width) * 0.5));
  stroke-opacity: calc(var(--safe-border-line-opacity) * 0.28);
}
.safe-border__title {
  fill: var(--safe-border-accent);
  font-size: 14px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  font-weight: 600;
  letter-spacing: 0.08em;
  dominant-baseline: auto;
  pointer-events: none;
}
.safe-border__error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--err);
  background: color-mix(in srgb, var(--err) 10%, transparent);
  border: 1px dashed var(--err);
  font-size: 12px;
}
</style>
