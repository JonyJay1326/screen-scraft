<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isProtocolValid, type AxisData } from '@screencraft/shared';
import { resolveComponentTemplate } from '../../registry';
import { useScreenStore } from '../../stores/screen';
import { cloneJson } from '../../utils/clone';
import { fetchApiConfigs, type ApiConfigListItem } from '../../api/apiConfig';
import { uploadAsset } from '../../api/runtime';

const store = useScreenStore();
const apis = ref<ApiConfigListItem[]>([]);
const selected = computed(() => store.currentPage?.components.find((item) => item.id === store.selectedIds[0]));
const tpl = computed(() => (selected.value ? resolveComponentTemplate(selected.value) : undefined));
const protocol = computed(() => tpl.value?.dataProtocol);
const invalid = computed(() =>
  selected.value && protocol.value ? !isProtocolValid(protocol.value, selected.value.data?.staticData) : false,
);
const source = computed(() => selected.value?.data?.source ?? 'static');
const axis = computed(() => selected.value?.data?.staticData as AxisData | undefined);

onMounted(async () => {
  try {
    apis.value = await fetchApiConfigs();
  } catch {
    apis.value = [];
  }
});

/** 写回 data 字段 */
function patchData(patch: Record<string, unknown>): void {
  if (!selected.value) {
    return;
  }
  store.patchComponent(selected.value.id, {
    data: { source: 'static', ...selected.value.data, ...patch },
  });
}

/** 切换来源 */
function setSource(next: 'static' | 'api' | 'builtin'): void {
  patchData({ source: next, staticData: selected.value?.data?.staticData ?? tpl.value?.defaultData });
}

const columns = computed(() => {
  if (!axis.value?.categories) {
    return [] as { key: string; label: string }[];
  }
  return [{ key: 'categories', label: 'categories' }, ...axis.value.series.map((serie) => ({ key: serie.name, label: serie.name }))];
});
const rows = computed(() => {
  if (!axis.value?.categories) {
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

const menuConfig = {
  enabled: true,
  body: {
    options: [
      [
        { code: 'insertRowBefore', name: '插入行上' },
        { code: 'insertRowAfter', name: '插入行下' },
        { code: 'deleteRow', name: '删除行' },
      ],
      [
        { code: 'insertColBefore', name: '插入列左' },
        { code: 'insertColAfter', name: '插入列右' },
        { code: 'deleteCol', name: '删除列' },
      ],
    ],
  },
};

/** 写 axis */
function writeAxis(next: AxisData): void {
  patchData({ source: 'static', staticData: next });
}

/** 改单元格 */
function setCell(row: number, key: string, value: string): void {
  if (!axis.value) {
    return;
  }
  const next = cloneJson(axis.value);
  if (key === 'categories') {
    next.categories[row] = value;
  } else {
    const serie = next.series.find((item) => item.name === key);
    if (serie) {
      serie.data[row] = Number(value);
    }
  }
  writeAxis(next);
}

/** 加行 */
function addRow(): void {
  if (!axis.value) {
    return;
  }
  const next = cloneJson(axis.value);
  next.categories.push(`项${next.categories.length + 1}`);
  next.series.forEach((serie) => serie.data.push(0));
  writeAxis(next);
}

/** 加列 */
function addCol(): void {
  if (!axis.value) {
    return;
  }
  const next = cloneJson(axis.value);
  next.series.push({ name: `系列${next.series.length + 1}`, data: next.categories.map(() => 0) });
  writeAxis(next);
}

/** 六项菜单 */
function onContext(action: string, row: number, colKey: string): void {
  if (!axis.value) {
    return;
  }
  const next = cloneJson(axis.value);
  if (action === 'insertRowBefore' || action === 'insertRowAfter') {
    const at = action === 'insertRowBefore' ? row : row + 1;
    next.categories.splice(at, 0, '新项');
    next.series.forEach((serie) => serie.data.splice(at, 0, 0));
  } else if (action === 'deleteRow' && next.categories.length > 1) {
    next.categories.splice(row, 1);
    next.series.forEach((serie) => serie.data.splice(row, 1));
  } else if ((action === 'insertColBefore' || action === 'insertColAfter') && colKey !== 'categories') {
    const idx = next.series.findIndex((item) => item.name === colKey);
    const at = action === 'insertColBefore' ? idx : idx + 1;
    next.series.splice(at, 0, { name: `系列${next.series.length + 1}`, data: next.categories.map(() => 0) });
  } else if (action === 'deleteCol' && colKey !== 'categories' && next.series.length > 1) {
    next.series = next.series.filter((item) => item.name !== colKey);
  }
  writeAxis(next);
}

/** vxe 编辑结束 */
function onEditClosed(params: { rowIndex: number; column: { field: string }; row: Record<string, string | number> }): void {
  setCell(params.rowIndex, params.column.field, String(params.row[params.column.field] ?? ''));
}

/** 写天气 adcode */
function setWeatherAdcode(adcode: string): void {
  if (!selected.value) {
    return;
  }
  patchData({ source: 'builtin', builtin: { provider: 'tencentWeather', adcode } });
  store.patchComponent(selected.value.id, { style: { ...selected.value.style, adcode } });
}

/** vxe 菜单 */
function onMenuClick(params: unknown): void {
  const body = params as { menu?: { code?: string }; rowIndex?: number; column?: { field?: string } };
  onContext(body.menu?.code ?? '', body.rowIndex ?? 0, body.column?.field ?? '');
}

const jsonText = computed(() => JSON.stringify(selected.value?.data?.staticData ?? null, null, 2));

/** JSON 回写 */
function onJson(ev: Event): void {
  try {
    const value = JSON.parse((ev.target as HTMLTextAreaElement).value);
    patchData({ source: 'static', staticData: value });
  } catch {
    /* 输入中 */
  }
}

/** 上传媒体 */
async function onFile(ev: Event): Promise<void> {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file || !selected.value) {
    return;
  }
  const { url } = await uploadAsset(file);
  store.patchComponent(selected.value.id, { style: { ...selected.value.style, src: url } });
}

const weatherMode = computed(() => selected.value?.templateId.startsWith('weather-'));
const mediaMode = computed(() => selected.value?.templateId.startsWith('media-'));
const axisMode = computed(() => protocol.value === 'axis' || protocol.value === 'combo');
</script>

<template>
  <div v-if="selected && tpl?.hasDataTab" class="p-sec data-panel">
    <div class="f-row">
      <span class="f-label">数据来源</span>
      <el-select
        class="ed-select"
        popper-class="ed-select-popper"
        :model-value="weatherMode ? 'builtin' : source"
        size="small"
        style="width: 140px"
        @change="(v: string) => setSource(v as 'static' | 'api' | 'builtin')"
      >
        <el-option v-if="!weatherMode" label="静态数据" value="static" />
        <el-option v-if="!weatherMode" label="API 接入" value="api" />
        <el-option v-if="weatherMode" label="内置天气" value="builtin" />
      </el-select>
    </div>

    <template v-if="weatherMode">
      <div class="f-row">
        <span class="f-label">adcode</span>
        <el-input
          :model-value="String(selected.data?.builtin?.adcode ?? selected.style.adcode ?? '330108')"
          size="small"
          @change="setWeatherAdcode"
        />
      </div>
      <p class="muted hint">天气只走系统内置接口，禁止前端直连腾讯。轮询默认 300 秒。</p>
    </template>

    <template v-else-if="source === 'api'">
      <div class="f-row">
        <span class="f-label">选择 API</span>
        <el-select
          class="ed-select"
          popper-class="ed-select-popper"
          :model-value="selected.data?.apiId"
          size="small"
          style="width: 170px"
          @change="(v: string) => patchData({ source: 'api', apiId: v })"
        >
          <el-option v-for="item in apis" :key="item._id" :label="item.name" :value="item._id" />
        </el-select>
      </div>
      <div class="f-row">
        <span class="f-label">轮询(秒)</span>
        <el-input-number :model-value="selected.data?.refreshSec ?? 5" :min="5" :max="3600" size="small" @change="(v: number | undefined) => patchData({ source: 'api', refreshSec: Math.max(5, v ?? 5) })" />
      </div>
    </template>

    <template v-else>
      <p v-if="invalid" class="warn">静态数据不符合协议，仍可保存</p>
      <template v-if="axisMode && axis">
        <div class="ops">
          <button class="btn btn-sm" type="button" @click="addRow">加行</button>
          <button class="btn btn-sm" type="button" @click="addCol">加列</button>
        </div>
        <div class="ed-static-table" v-bind="{ ['data-vxe-ui-theme']: 'dark' }">
          <vxe-table
            :data="rows"
            border
            size="mini"
            max-height="280"
            :edit-config="{ trigger: 'click', mode: 'cell' }"
            :menu-config="menuConfig"
            @edit-closed="onEditClosed"
            @menu-click="onMenuClick"
          >
            <template v-for="col in columns" :key="col.key">
              <vxe-column :field="col.key" :title="col.label" :edit-render="{ name: 'input' }" min-width="88" />
            </template>
          </vxe-table>
        </div>
        <p class="muted hint">点击编辑；右键插入行上/下、删除行、插入列左/右、删除列。</p>
      </template>
      <textarea v-else class="textarea json" :value="jsonText" @change="onJson" />
    </template>

    <div v-if="mediaMode" class="mt-16">
      <input type="file" accept="image/*,video/*" @change="onFile" />
    </div>
  </div>
  <div v-else class="p-sec muted">当前组件无数据绑定</div>
</template>

<style scoped>
.warn { color: var(--warn); font-size: 12px; margin-bottom: 8px; }
.ops { display: flex; gap: 6px; margin: 0 0 8px; }
.hint { margin-top: 8px; font-size: 12px; line-height: 1.5; }
.json { min-height: 160px; font-family: var(--font-num); font-size: 12px; }
</style>
