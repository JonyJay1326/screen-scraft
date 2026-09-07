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
    <div class="hd">{{ style.title || style.boardTitle }}</div>
  </div>
</template>

<style scoped>
.bd { width: 100%; height: 100%; position: relative; box-sizing: border-box; border: 1px solid rgba(53,114,200,.45); border-radius: 6px; background: rgba(14,26,51,.35); }
.c { position: absolute; width: 10px; height: 10px; border: 2px solid var(--acc); }
.tl { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }
.tr { top: -1px; right: -1px; border-left: 0; border-bottom: 0; }
.bl { bottom: -1px; left: -1px; border-right: 0; border-top: 0; }
.br { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }
.hd { position: absolute; top: 10px; left: 16px; font-size: 13px; color: var(--t1); letter-spacing: .08em; }
.v2 { border-width: 3px; border-color: #2F7FF7; }
.v3 { border-color: #A78BFA; box-shadow: inset 0 0 24px rgba(167,139,250,.2); }
.v4 { border-color: #F59E0B; }
.v5 { border-color: #34D399; }
</style>
