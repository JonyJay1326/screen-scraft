<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentDoc } from '@screencraft/shared';
import { resolveComponentTemplate } from '../../registry';

const props = defineProps<{
  doc: ComponentDoc;
  mode: 'edit' | 'runtime';
  runtimeData?: unknown;
  loadFailed?: boolean;
  loading?: boolean;
}>();

defineEmits<{ change: [value: string] }>();

const tpl = computed(() => resolveComponentTemplate(props.doc));
const data = computed(() => (props.mode === 'runtime' && props.runtimeData !== undefined ? props.runtimeData : props.doc.data?.staticData));
</script>

<template>
  <div class="rt-root">
    <div v-if="loading && mode === 'runtime'" class="loading">数据加载中…</div>
    <div v-else-if="loadFailed && mode === 'runtime'" class="fail">数据加载失败</div>
    <component
      :is="tpl.renderer"
      v-else-if="tpl"
      :doc="doc"
      :data="data"
      :mode="mode"
      @change="$emit('change', $event)"
    />
    <div v-else class="ph">组件配置不可用</div>
  </div>
</template>

<style scoped>
.rt-root { width: 100%; height: 100%; overflow: hidden; }
.ph, .fail, .loading {
  width: 100%; height: 100%; display: grid; place-items: center;
  background: color-mix(in srgb, var(--pri) 12%, transparent); border: 1px dashed var(--pri); color: var(--t2); font-size: 13px;
}
.fail { color: var(--err); border-color: var(--err); }
.loading { animation: pulse 1.2s ease-in-out infinite alternate; }
@keyframes pulse { to { opacity: 0.55; } }
</style>
