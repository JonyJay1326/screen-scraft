<script setup lang="ts">
import { computed } from 'vue';
import type { StyleField } from '../../registry/types';
import { useScreenStore } from '../../stores/screen';
import { getTemplate } from '../../registry';

const store = useScreenStore();
const selected = computed(() => store.currentPage?.components.find((item) => item.id === store.selectedIds[0]));
const tpl = computed(() => (selected.value ? getTemplate(selected.value.templateId) : undefined));
const groups = computed(() => {
  const map = new Map<string, StyleField[]>();
  tpl.value?.styleSchema.forEach((field) => {
    const list = map.get(field.group) ?? [];
    list.push(field);
    map.set(field.group, list);
  });
  return [...map.entries()];
});

const merged = computed(() => {
  if (!selected.value || !tpl.value) {
    return {} as Record<string, unknown>;
  }
  return { ...tpl.value.defaultStyle[selected.value.theme], ...selected.value.style };
});

/** 写回样式 */
function setStyle(key: string, value: unknown): void {
  if (!selected.value) {
    return;
  }
  store.patchComponent(selected.value.id, { style: { ...selected.value.style, [key]: value } });
}
</script>

<template>
  <div v-if="selected && tpl">
    <section v-for="[group, fields] in groups" :key="group" class="p-sec">
      <h4>{{ group }}</h4>
      <div v-for="field in fields" :key="field.key" class="f-row">
        <span class="f-label">{{ field.label }}</span>
        <div class="f-ctrl">
          <el-switch v-if="field.type === 'switch'" :model-value="Boolean(merged[field.key])" @change="setStyle(field.key, $event)" />
          <el-input v-else-if="field.type === 'text'" :model-value="String(merged[field.key] ?? '')" @input="setStyle(field.key, $event)" />
          <el-input-number
            v-else-if="field.type === 'number'"
            :model-value="Number(merged[field.key] ?? 0)"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            @change="(v: number | undefined) => setStyle(field.key, v ?? 0)"
          />
          <el-color-picker v-else-if="field.type === 'color'" :model-value="String(merged[field.key] ?? '#ffffff')" @change="(v: string | null) => v && setStyle(field.key, v)" />
          <el-select v-else-if="field.type === 'select'" :model-value="String(merged[field.key] ?? '')" @change="setStyle(field.key, $event)">
            <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <div v-else-if="field.type === 'colorList'" class="colors">
            <el-color-picker
              v-for="(c, i) in (merged[field.key] as string[])"
              :key="i"
              :model-value="c"
              @change="(v: string | null) => {
                const next = [...(merged[field.key] as string[])];
                if (v) next[i] = v;
                setStyle(field.key, next);
              }"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
  <div v-else class="p-sec muted">选中组件后配置样式</div>
</template>
