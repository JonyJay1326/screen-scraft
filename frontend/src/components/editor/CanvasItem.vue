<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ComponentDoc } from '@screencraft/shared';
import { Lock, Trash2 } from 'lucide-vue-next';
import ComponentRenderer from '../runtime/ComponentRenderer.vue';
import { useScreenStore } from '../../stores/screen';

const props = defineProps<{ doc: ComponentDoc }>();
const emit = defineEmits<{ select: [id: string, additive: boolean] }>();
const store = useScreenStore();
const ratioLocked = ref(false);
const selected = computed(() => store.selectedIds.includes(props.doc.id));

/** 开始拖拽或缩放 */
function onPointerDown(event: PointerEvent, mode: 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'): void {
  if (props.doc.locked) {
    return;
  }
  event.stopPropagation();
  event.preventDefault();
  store.pushHistory();
  const startX = event.clientX;
  const startY = event.clientY;
  const origin = { x: props.doc.x, y: props.doc.y, w: props.doc.w, h: props.doc.h };
  const scale = store.zoom / 100;
  const ratio = origin.w / origin.h;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);

  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - startX) / scale;
    const dy = (ev.clientY - startY) / scale;
    const next = { ...origin };
    if (mode === 'move') {
      next.x = origin.x + dx;
      next.y = origin.y + dy;
    } else {
      if (mode.includes('e')) {
        next.w = Math.max(40, origin.w + dx);
      }
      if (mode.includes('s')) {
        next.h = Math.max(40, origin.h + dy);
      }
      if (mode.includes('w')) {
        next.w = Math.max(40, origin.w - dx);
        next.x = origin.x + dx;
      }
      if (mode.includes('n')) {
        next.h = Math.max(40, origin.h - dy);
        next.y = origin.y + dy;
      }
      if (ratioLocked.value) {
        next.h = next.w / ratio;
      }
    }
    store.updateGeometry(props.doc.id, next, false);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
</script>

<template>
  <div
    class="cv-comp"
    :class="{ selected, hidden: doc.hidden }"
    :style="{ left: doc.x + 'px', top: doc.y + 'px', width: doc.w + 'px', height: doc.h + 'px', zIndex: doc.zIndex }"
    @mousedown.shift="emit('select', doc.id, true)"
    @mousedown.exact="emit('select', doc.id, false)"
    @pointerdown="onPointerDown($event, 'move')"
    @dblclick="doc.groupId && (store.inGroupId = doc.groupId)"
  >
    <div class="cv-label">{{ doc.name }}</div>
    <ComponentRenderer :doc="doc" mode="edit" />
    <template v-if="selected">
      <i class="cv-handle tl" @pointerdown="onPointerDown($event, 'nw')" />
      <i class="cv-handle tr" @pointerdown="onPointerDown($event, 'ne')" />
      <i class="cv-handle bl" @pointerdown="onPointerDown($event, 'sw')" />
      <i class="cv-handle br" @pointerdown="onPointerDown($event, 'se')" />
      <button class="ratio" type="button" :class="{ on: ratioLocked }" @click.stop="ratioLocked = !ratioLocked"><Lock :size="10" /></button>
      <button class="del" type="button" @click.stop="store.removeSelected()"><Trash2 :size="12" /></button>
    </template>
  </div>
</template>

<style scoped>
.cv-comp { position: absolute; border: 1px solid transparent; cursor: move; }
.cv-comp.hidden { opacity: .45; }
.cv-comp.selected { border-color: var(--pri); }
.cv-label {
  position: absolute; top: -22px; left: -1px; font-size: 11px; background: var(--pri); color: #fff;
  padding: 2px 7px; border-radius: 3px; display: none;
}
.cv-comp.selected .cv-label { display: block; }
.cv-handle { position: absolute; width: 8px; height: 8px; background: #fff; border: 1px solid var(--pri); }
.tl { top: -4px; left: -4px; cursor: nwse-resize; }
.tr { top: -4px; right: -4px; cursor: nesw-resize; }
.bl { bottom: -4px; left: -4px; cursor: nesw-resize; }
.br { bottom: -4px; right: -4px; cursor: nwse-resize; }
.ratio, .del {
  position: absolute; width: 18px; height: 18px; display: grid; place-items: center;
  background: #12203c; border: 1px solid var(--pri); color: var(--t2); border-radius: 3px;
}
.ratio { top: -22px; right: 22px; }
.ratio.on { color: var(--pri); }
.del { top: 50%; right: -28px; transform: translateY(-50%); color: var(--err); }
</style>
