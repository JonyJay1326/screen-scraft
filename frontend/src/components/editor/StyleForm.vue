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

/** 写回样式并记历史 */
function setStyle(key: string, value: unknown, record = true): void {
  if (!selected.value) {
    return;
  }
  store.patchComponent(selected.value.id, { style: { ...selected.value.style, [key]: value } }, record);
}

/** 更新系列色板某一项 */
function setColorAt(index: number, value: string | null): void {
  if (!value) {
    return;
  }
  const next = [...((merged.value.seriesColors as string[]) ?? [])];
  next[index] = value;
  setStyle('seriesColors', next);
}

/** 追加系列颜色 */
function addColor(): void {
  const next = [...((merged.value.seriesColors as string[]) ?? []), '#2F7FF7'];
  setStyle('seriesColors', next);
}

/** 删除系列颜色 */
function removeColor(index: number): void {
  const next = ((merged.value.seriesColors as string[]) ?? []).filter((_, i) => i !== index);
  if (!next.length) {
    return;
  }
  setStyle('seriesColors', next);
}
</script>

<template>
  <div v-if="selected && tpl" class="style-form">
    <section v-for="[group, fields] in groups" :key="group" class="p-sec">
      <h4>{{ group }}</h4>
      <div v-for="field in fields" :key="field.key" class="f-row">
        <span class="f-label">{{ field.label }}</span>
        <div class="f-ctrl">
          <el-switch v-if="field.type === 'switch'" :model-value="Boolean(merged[field.key])" @change="setStyle(field.key, $event)" />
          <el-input
            v-else-if="field.type === 'text'"
            :model-value="String(merged[field.key] ?? '')"
            :maxlength="field.key === 'src' || field.key === 'content' ? 500 : 40"
            @change="setStyle(field.key, $event)"
          />
          <el-input-number
            v-else-if="field.type === 'number'"
            :model-value="Number(merged[field.key] ?? 0)"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            size="small"
            controls-position="right"
            @change="(v: number | undefined) => setStyle(field.key, v ?? 0)"
          />
          <el-color-picker v-else-if="field.type === 'color'" :model-value="String(merged[field.key] ?? '#ffffff')" @change="(v: string | null) => v && setStyle(field.key, v)" />
          <el-select v-else-if="field.type === 'select'" :model-value="String(merged[field.key] ?? '')" @change="setStyle(field.key, $event)">
            <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <div v-else-if="field.type === 'colorList'" class="colors">
            <div v-for="(c, i) in (merged[field.key] as string[])" :key="i" class="color-item">
              <el-color-picker :model-value="c" @change="(v: string | null) => setColorAt(i, v)" />
              <button class="color-del" type="button" title="删除此色" @click="removeColor(i)">×</button>
            </div>
            <button class="btn btn-sm" type="button" @click="addColor">加色</button>
          </div>
        </div>
      </div>
    </section>
  </div>
  <div v-else class="p-sec muted">选中组件后配置样式</div>
</template>

<style scoped>
.style-form :deep(.el-input-number) {
  width: 118px;
}
.style-form :deep(.el-select) {
  width: 140px;
}
.style-form :deep(.el-input) {
  width: 160px;
}
.colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
}
.color-item {
  position: relative;
}
.color-del {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--t2);
  font-size: 10px;
  line-height: 12px;
}
</style>
