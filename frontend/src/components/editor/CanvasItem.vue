<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ComponentDoc } from '@screencraft/shared';
import { Lock, Trash2 } from 'lucide-vue-next';
import ComponentRenderer from '../runtime/ComponentRenderer.vue';
import { useScreenStore } from '../../stores/screen';
import { snapMove, snapResize, type CanvasRect } from './snap-align';

type ResizeMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const props = defineProps<{ doc: ComponentDoc }>();
const store = useScreenStore();
const ratioLocked = ref(false);
const selected = computed(() => store.selectedIds.includes(props.doc.id));
const isBorder = computed(() => {
  const rendererKey = props.doc.definitionSnapshot?.rendererKey;
  return props.doc.templateId.startsWith('border-')
    || rendererKey === 'border-parametric-v1'
    || rendererKey === 'border-nine-slice-v1';
});
/** 组外多选时只允许整组移动，隐藏单组件缩放手柄 */
const showHandles = computed(() => selected.value && (Boolean(store.inGroupId) || store.selectedIds.length === 1));

/** 其它可见组件矩形（吸附参考，排除当前拖动集合） */
function otherRects(excludeIds: string[]): CanvasRect[] {
  const exclude = new Set(excludeIds);
  return store.visibleComponents
    .filter((item) => !exclude.has(item.id) && !item.hidden)
    .map((item) => ({ x: item.x, y: item.y, w: item.w, h: item.h }));
}

/** 画布尺寸 */
function canvasSize(): { width: number; height: number } {
  const c = store.screen?.canvas;
  return { width: c?.width ?? 1920, height: c?.height ?? 1080 };
}

/** 选中组件并开始拖拽/缩放（按下即选中，移动超过阈值才记历史） */
function onPointerDown(event: PointerEvent, mode: ResizeMode): void {
  if (event.button !== 0) {
    return;
  }
  event.stopPropagation();
  store.selectComponent(props.doc.id, event.shiftKey);
  if (props.doc.locked) {
    return;
  }
  const startX = event.clientX;
  const startY = event.clientY;
  const scale = store.zoom / 100;
  const moveIds = mode === 'move' ? [...store.selectedIds] : [props.doc.id];
  const origins = new Map(
    store.visibleComponents
      .filter((item) => moveIds.includes(item.id))
      .map((item) => [item.id, { x: item.x, y: item.y, w: item.w, h: item.h }] as const),
  );
  const origin = origins.get(props.doc.id) ?? { x: props.doc.x, y: props.doc.y, w: props.doc.w, h: props.doc.h };
  const ratio = origin.w / Math.max(1, origin.h);
  let recorded = false;
  const host = event.currentTarget as HTMLElement;
  try {
    host.setPointerCapture(event.pointerId);
  } catch {
    /* 部分合成指针没有有效 pointerId */
  }

  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - startX) / scale;
    const dy = (ev.clientY - startY) / scale;
    if (!recorded) {
      if (mode === 'move' && Math.hypot(dx, dy) < 4) {
        return;
      }
      store.pushHistory();
      recorded = true;
    }
    if (mode === 'move') {
      const primaryNext = { x: origin.x + dx, y: origin.y + dy, w: origin.w, h: origin.h };
      const snapped = snapMove(primaryNext, otherRects(moveIds), canvasSize());
      const adx = snapped.x - origin.x;
      const ady = snapped.y - origin.y;
      store.alignGuides = snapped.guides;
      store.updateGeometries(
        moveIds.map((id) => {
          const o = origins.get(id)!;
          return { id, geom: { x: o.x + adx, y: o.y + ady } };
        }),
        false,
      );
      return;
    }
    let next = { ...origin };
    if (mode.includes('e')) {
      next.w = Math.max(40, origin.w + dx);
    }
    if (mode.includes('s')) {
      next.h = Math.max(40, origin.h + dy);
    }
    if (mode.includes('w')) {
      next.w = Math.max(40, origin.w - dx);
      next.x = origin.x + origin.w - next.w;
    }
    if (mode.includes('n')) {
      next.h = Math.max(40, origin.h - dy);
      next.y = origin.y + origin.h - next.h;
    }
    if (ratioLocked.value) {
      next.h = next.w / ratio;
      if (mode.includes('n')) {
        next.y = origin.y + origin.h - next.h;
      }
      if (mode.includes('w')) {
        next.x = origin.x + origin.w - next.w;
      }
    }
    const snapped = snapResize(origin, next, mode, otherRects([props.doc.id]), canvasSize());
    next = snapped.rect;
    store.alignGuides = snapped.guides;
    store.updateGeometry(props.doc.id, next, false);
  };
  const onUp = () => {
    store.alignGuides = [];
    try {
      host.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('pointercancel', onUp);
  };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onUp);
}

/** 双击进入组内模式 */
function onDblClick(): void {
  if (props.doc.groupId && !store.inGroupId) {
    store.inGroupId = props.doc.groupId;
    store.selectedIds = [props.doc.id];
  }
}

/** 删除当前组件（在 pointerdown 处理，避免父级 pointer capture 吞掉 click） */
function onDelete(): void {
  store.selectComponent(props.doc.id, false);
  store.removeSelected();
}
</script>

<template>
  <div
    class="cv-comp"
    :class="{ selected, hidden: doc.hidden, grouped: Boolean(doc.groupId) && !store.inGroupId }"
    :data-comp-id="doc.id"
    :data-template="doc.templateId"
    :style="{ left: doc.x + 'px', top: doc.y + 'px', width: doc.w + 'px', height: doc.h + 'px', zIndex: doc.zIndex }"
    @pointerdown="onPointerDown($event, 'move')"
    @dblclick="onDblClick"
  >
    <div v-if="!isBorder" class="cv-label">{{ doc.name }}</div>
    <ComponentRenderer :doc="doc" mode="edit" />
    <template v-if="showHandles">
      <i class="cv-handle t" @pointerdown.stop="onPointerDown($event, 'n')" />
      <i class="cv-handle b" @pointerdown.stop="onPointerDown($event, 's')" />
      <i class="cv-handle l" @pointerdown.stop="onPointerDown($event, 'w')" />
      <i class="cv-handle r" @pointerdown.stop="onPointerDown($event, 'e')" />
      <i class="cv-handle tl" @pointerdown.stop="onPointerDown($event, 'nw')" />
      <i class="cv-handle tr" @pointerdown.stop="onPointerDown($event, 'ne')" />
      <i class="cv-handle bl" @pointerdown.stop="onPointerDown($event, 'sw')" />
      <i class="cv-handle br" @pointerdown.stop="onPointerDown($event, 'se')" />
      <button
        class="ratio"
        type="button"
        :class="{ on: ratioLocked }"
        title="锁定宽高比"
        @pointerdown.stop
        @click.stop="ratioLocked = !ratioLocked"
      >
        <Lock :size="10" />
      </button>
      <button class="del" type="button" title="删除" @pointerdown.stop.prevent="onDelete">
        <Trash2 :size="12" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.cv-comp {
  position: absolute;
  border: 1px solid transparent;
  cursor: move;
  user-select: none;
}
.cv-comp.hidden {
  opacity: 0.45;
}
.cv-comp.grouped.selected {
  border-color: rgba(47, 127, 247, 0.35);
}
.cv-comp :deep(.rt-root) {
  pointer-events: none;
}
.ratio,
.del {
  position: absolute;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  background: #12203c;
  border: 1px solid var(--pri);
  color: var(--t2);
  border-radius: 3px;
  z-index: 3;
}
.ratio {
  top: -22px;
  right: 22px;
}
.ratio.on {
  color: var(--pri);
}
.del {
  top: 50%;
  right: -28px;
  transform: translateY(-50%);
  color: var(--err);
}
</style>
