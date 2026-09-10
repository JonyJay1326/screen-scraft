<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isProtocolValid } from '@screencraft/shared';
import { resolveComponentTemplate } from '../../registry';
import { useScreenStore } from '../../stores/screen';
import { fetchApiConfigs, type ApiConfigListItem } from '../../api/apiConfig';
import { uploadAsset } from '../../api/runtime';
import {
  applyAddCol,
  applyAddRow,
  applyCellEdit,
  applyContextAction,
  canAddColumn,
  canAddRow,
  modelColumns,
  modelRows,
  resolveStaticTableModel,
  supportsStaticTable,
  type StaticTableModel,
} from './static-data-table';

const store = useScreenStore();
const apis = ref<ApiConfigListItem[]>([]);
const selected = computed(() => store.currentPage?.components.find((item) => item.id === store.selectedIds[0]));
const tpl = computed(() => (selected.value ? resolveComponentTemplate(selected.value) : undefined));
const protocol = computed(() => tpl.value?.dataProtocol);
const invalid = computed(() =>
  selected.value && protocol.value ? !isProtocolValid(protocol.value, selected.value.data?.staticData) : false,
);
const source = computed(() => selected.value?.data?.source ?? 'static');

const tableModel = computed(() =>
  resolveStaticTableModel(protocol.value, selected.value?.data?.staticData),
);

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

/** 写回表格编辑结果 */
function commitModel(next: unknown): void {
  patchData({ source: 'static', staticData: next });
}

const mainColumns = computed(() => (tableModel.value ? modelColumns(tableModel.value, 'main') : []));
const mainRows = computed(() => (tableModel.value ? modelRows(tableModel.value, 'main') : []));
const sideColumns = computed(() =>
  tableModel.value?.kind === 'kpi3' ? modelColumns(tableModel.value, 'sides') : [],
);
const sideRows = computed(() =>
  tableModel.value?.kind === 'kpi3' ? modelRows(tableModel.value, 'sides') : [],
);
const showAddCol = computed(() => (tableModel.value ? canAddColumn(tableModel.value, 'main') : false));
const showAddRow = computed(() => (tableModel.value ? canAddRow(tableModel.value, 'main') : false));
const showSideAddRow = computed(() => (tableModel.value ? canAddRow(tableModel.value, 'sides') : false));

/** 右键菜单配置 */
function buildMenuConfig(model: StaticTableModel | undefined, section: 'main' | 'sides') {
  const rowMenus = [
    { code: 'insertRowBefore', name: '插入行上' },
    { code: 'insertRowAfter', name: '插入行下' },
    { code: 'deleteRow', name: '删除行' },
  ];
  const colMenus = model && canAddColumn(model, section)
    ? [
        { code: 'insertColBefore', name: '插入列左' },
        { code: 'insertColAfter', name: '插入列右' },
        { code: 'deleteCol', name: '删除列' },
      ]
    : [];
  return {
    enabled: true,
    body: {
      options: colMenus.length ? [rowMenus, colMenus] : [rowMenus],
    },
  };
}

const mainMenuConfig = computed(() => buildMenuConfig(tableModel.value, 'main'));
const sideMenuConfig = computed(() => buildMenuConfig(tableModel.value, 'sides'));

/** vxe 单元格编辑结束参数 */
type VxeEditClosed = {
  rowIndex: number;
  column: { field: string };
  row: Record<string, string | number>;
};

/** 改单元格 */
function onEditClosed(section: 'main' | 'sides', params: VxeEditClosed): void {
  if (!tableModel.value) {
    return;
  }
  commitModel(
    applyCellEdit(
      tableModel.value,
      params.rowIndex,
      params.column.field,
      String(params.row[params.column.field] ?? ''),
      section,
    ),
  );
}

/** 加行 */
function onAddRow(section: 'main' | 'sides' = 'main'): void {
  if (!tableModel.value) {
    return;
  }
  commitModel(applyAddRow(tableModel.value, section));
}

/** 加列 */
function onAddCol(): void {
  if (!tableModel.value) {
    return;
  }
  commitModel(applyAddCol(tableModel.value));
}

/** 右键菜单 */
function onMenuClick(section: 'main' | 'sides', params: unknown): void {
  if (!tableModel.value) {
    return;
  }
  const body = params as { menu?: { code?: string }; rowIndex?: number; column?: { field?: string } };
  commitModel(
    applyContextAction(
      tableModel.value,
      body.menu?.code ?? '',
      body.rowIndex ?? 0,
      body.column?.field ?? '',
      section,
    ),
  );
}

/** 写天气 adcode */
function setWeatherAdcode(adcode: string): void {
  if (!selected.value) {
    return;
  }
  patchData({ source: 'builtin', builtin: { provider: 'tencentWeather', adcode } });
  store.patchComponent(selected.value.id, { style: { ...selected.value.style, adcode } });
}

const jsonText = computed(() => JSON.stringify(selected.value?.data?.staticData ?? null, null, 2));

/** JSON 回写兜底 */
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
const hasTableData = computed(() => Boolean(tableModel.value) && supportsStaticTable(protocol.value));
const isKpi3 = computed(() => tableModel.value?.kind === 'kpi3');
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
      <template v-if="hasTableData && tableModel">
        <p v-if="isKpi3" class="section-label">中心指标</p>
        <div class="ops">
          <button v-if="showAddRow" class="btn btn-sm" type="button" @click="onAddRow('main')">加行</button>
          <button v-if="showAddCol" class="btn btn-sm" type="button" @click="onAddCol">加列</button>
        </div>
        <div class="ed-static-table" v-bind="{ ['data-vxe-ui-theme']: 'dark' }">
          <vxe-table
            :data="mainRows"
            border
            size="mini"
            max-height="280"
            :edit-config="{ trigger: 'click', mode: 'cell' }"
            :menu-config="mainMenuConfig"
            @edit-closed="(p: VxeEditClosed) => onEditClosed('main', p)"
            @menu-click="(p: unknown) => onMenuClick('main', p)"
          >
            <template v-for="col in mainColumns" :key="col.key">
              <vxe-column :field="col.key" :title="col.label" :edit-render="{ name: 'input' }" min-width="88" />
            </template>
          </vxe-table>
        </div>

        <template v-if="isKpi3">
          <p class="section-label">两侧指标</p>
          <div class="ops">
            <button v-if="showSideAddRow" class="btn btn-sm" type="button" @click="onAddRow('sides')">加行</button>
          </div>
          <div class="ed-static-table" v-bind="{ ['data-vxe-ui-theme']: 'dark' }">
            <vxe-table
              :data="sideRows"
              border
              size="mini"
              max-height="200"
              :edit-config="{ trigger: 'click', mode: 'cell' }"
              :menu-config="sideMenuConfig"
              @edit-closed="(p: VxeEditClosed) => onEditClosed('sides', p)"
              @menu-click="(p: unknown) => onMenuClick('sides', p)"
            >
              <template v-for="col in sideColumns" :key="col.key">
                <vxe-column :field="col.key" :title="col.label" :edit-render="{ name: 'input' }" min-width="88" />
              </template>
            </vxe-table>
          </div>
        </template>

        <p class="muted hint">
          点击编辑；右键插入行上/下、删除行<span v-if="showAddCol">、插入列左/右、删除列</span>。
        </p>
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
.section-label { margin: 10px 0 6px; font-size: 12px; color: var(--text-2); }
</style>
