<script setup lang="ts">
import type { ComponentDoc } from '@screencraft/shared';
import { getTemplate } from '../../registry';

const props = defineProps<{
  doc: ComponentDoc;
  mode: 'edit' | 'runtime';
}>();

const tpl = getTemplate(props.doc.templateId);
const data = props.doc.data?.staticData;
</script>

<template>
  <component :is="tpl.renderer" v-if="tpl" :doc="doc" :data="data" :mode="mode" />
  <div v-else class="ph">{{ doc.name }}</div>
</template>

<style scoped>
.ph {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: rgba(47, 127, 247, 0.12);
  border: 1px dashed #2f7ff7;
  color: #9fb3d1;
  font-size: 13px;
}
</style>
