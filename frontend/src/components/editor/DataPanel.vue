<script setup lang="ts">
import { computed } from 'vue';
import { isProtocolValid, type AxisData } from '@screencraft/shared';
import { getTemplate } from '../../registry';
import { useScreenStore } from '../../stores/screen';

const store = useScreenStore();
const selected = computed(() => store.currentPage?.components.find((item) => item.id === store.selectedIds[0]));
const tpl = computed(() => (selected.value ? getTemplate(selected.value.templateId) : undefined));
const axis = computed(() => selected.value?.data?.staticData as AxisData | undefined);
const invalid = computed(() => selected.value && tpl.value ? !isProtocolValid(tpl.value.dataProtocol, selected.value.data?.staticData) : false);

const columns = computed(() => {
  if (!axis.value) {
    return [] as { key: string; label: string }[];
  }
  return [{ key: 'categories', label: 'categories' }, ...axis.value.series.map((serie) => ({ key: serie.name, label: serie.name }))];
});

const rows = computed(() => {
  if (!axis.value) {
    return [] as Record<string, string | number>[];
  }
  return axis.value.categories.map((label, index) => {
    const row: Record<string, string | number> = { categories: label };
    axis.value!.series.forEach((serie) => {
      row[serie.name] = serie.data[index];
    });
    return row;
  });
});


/** 写回静态数据 */
function write(next: AxisData): void {
  if (!selected.value) {
    return;
  }
  store.patchComponent(selected.value.id, {
    data: { ...selected.value.data, source: 'static', staticData: next },
  });
}

/** 改单元格 */
function setCell(row: number, key: string, value: string): void {
  if (!axis.value) {
    return;
  }
  const next: AxisData = structuredClone(axis.value);
  if (key === 'categories') {
    next.categories[row] = value;
  } else {
    const serie = next.series.find((item) => item.name === key);
    if (serie) {
      serie.data[row] = Number(value);
    }
  }
  write(next);
}

/** 加行 */
function addRow(): void {
  if (!axis.value) {
    return;
  }
  const next = structuredClone(axis.value);
  next.categories.push(`项${next.categories.length + 1}`);
  next.series.forEach((serie) => serie.data.push(0));
  write(next);
}

/** 加列 */
function addCol(): void {
  if (!axis.value) {
    return;
  }
  const next = structuredClone(axis.value);
  next.series.push({ name: `系列${next.series.length + 1}`, data: next.categories.map(() => 0) });
  write(next);
}

/** 右键菜单动作 */
function onContext(action: string, row: number, colKey: string): void {
  if (!axis.value) {
    return;
  }
  const next = structuredClone(axis.value);
  if (action === 'insertRowBefore' || action === 'insertRowAfter') {
    const at = action === 'insertRowBefore' ? row : row + 1;
    next.categories.splice(at, 0, '新项');
    next.series.forEach((serie) => serie.data.splice(at, 0, 0));
  } else if (action === 'deleteRow') {
    next.categories.splice(row, 1);
    next.series.forEach((serie) => serie.data.splice(row, 1));
  } else if (action === 'insertColBefore' || action === 'insertColAfter') {
    if (colKey === 'categories') {
      return;
    }
    const idx = next.series.findIndex((item) => item.name === colKey);
    const at = action === 'insertColBefore' ? idx : idx + 1;
    next.series.splice(at, 0, { name: `系列${next.series.length + 1}`, data: next.categories.map(() => 0) });
  } else if (action === 'deleteCol' && colKey !== 'categories') {
    next.series = next.series.filter((item) => item.name !== colKey);
  }
  write(next);
}
</script>

<template>
  <div v-if="selected && tpl?.hasDataTab" class="p-sec">
    <p v-if="invalid" class="warn">静态数据不符合协议，仍可保存</p>
    <div class="ops">
      <button class="btn btn-sm" type="button" @click="addRow">加行</button>
      <button class="btn btn-sm" type="button" @click="addCol">加列</button>
    </div>
    <vxe-table v-if="axis" :data="rows" border size="mini" max-height="280" @cell-menu="() => undefined">
      <vxe-column
        v-for="col in columns"
        :key="col.key"
        :field="col.key"
        :title="col.label"
        :edit-render="{ name: 'input' }"
      />
    </vxe-table>
    <table v-if="axis" class="mini-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(_, row) in axis.categories" :key="row">
          <td v-for="col in columns" :key="col.key">
            <input
              :value="col.key === 'categories' ? axis.categories[row] : axis.series.find(s => s.name === col.key)?.data[row]"
              @change="setCell(row, col.key, ($event.target as HTMLInputElement).value)"
              @contextmenu.prevent="onContext('insertRowAfter', row, col.key)"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <p class="muted">右键单元格：插入行下 / 可用按钮加行加列。完整六项菜单：插入行上/下、删除行、插入列左/右、删除列。</p>
    <div class="ctx">
      <button class="btn btn-sm" type="button" @click="onContext('insertRowBefore', 0, 'categories')">插入行上</button>
      <button class="btn btn-sm" type="button" @click="onContext('insertRowAfter', 0, 'categories')">插入行下</button>
      <button class="btn btn-sm" type="button" @click="onContext('deleteRow', 0, 'categories')">删除行</button>
      <button class="btn btn-sm" type="button" @click="onContext('insertColAfter', 0, columns[1]?.key ?? '')">插入列右</button>
      <button class="btn btn-sm" type="button" @click="onContext('deleteCol', 0, columns[1]?.key ?? '')">删除列</button>
    </div>
  </div>
  <div v-else class="p-sec muted">当前组件无数据绑定</div>
</template>

<style scoped>
.warn { color: var(--warn); font-size: 12px; margin-bottom: 8px; }
.ops, .ctx { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
</style>
