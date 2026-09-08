<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentDoc } from '@screencraft/shared';
import { getMeta } from '../meta-lookup';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const variant = computed(() => Number(props.doc.templateId.split('-')[1] || 1));
</script>

<template>
  <div class="bd" :class="'v' + variant">
    <span class="c tl" /><span class="c tr" /><span class="c bl" /><span class="c br" />
    <div v-if="style.title || style.boardTitle" class="hd">{{ style.title || style.boardTitle }}</div>
  </div>
</template>

<style scoped>
.bd {
  width: 100%;
  height: 100%;
  position: relative;
  box-sizing: border-box;
  border: 1px solid rgba(53, 114, 200, 0.45);
  border-radius: 6px;
  background: rgba(14, 26, 51, 0.35);
}
.c {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid var(--acc);
  box-sizing: border-box;
}
.tl { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }
.tr { top: -1px; right: -1px; border-left: 0; border-bottom: 0; }
.bl { bottom: -1px; left: -1px; border-right: 0; border-top: 0; }
.br { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }
.hd {
  position: absolute;
  top: 12px;
  left: 18px;
  font-size: 13px;
  color: var(--t1);
  letter-spacing: 0.08em;
}
/* 默认深蓝 */
.v1 {
  border-color: rgba(53, 114, 200, 0.55);
  background: rgba(14, 26, 51, 0.4);
}
.v1 .c { border-color: #5B9CFF; }
/* 工业蓝 */
.v2 {
  border-width: 2px;
  border-color: #2F7FF7;
  background: rgba(14, 32, 64, 0.45);
  box-shadow: inset 0 0 0 1px rgba(47, 127, 247, 0.2);
}
.v2 .c {
  width: 14px;
  height: 14px;
  border-width: 3px;
  border-color: #2F7FF7;
}
/* 科幻紫 */
.v3 {
  border-color: #A78BFA;
  background: rgba(28, 20, 48, 0.45);
  box-shadow: inset 0 0 28px rgba(167, 139, 250, 0.22);
}
.v3 .c { border-color: #C4B5FD; }
</style>
