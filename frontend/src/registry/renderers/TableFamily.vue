<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentDoc, TableData } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { getMeta } from '../meta-lookup';
import ComponentAccessories from './ComponentAccessories.vue';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const valid = computed(() => isProtocolValid('table', props.data));
const table = computed(() => props.data as TableData | undefined);
const alarm = computed(() => props.doc.templateId === 'table-alarm');
const panelStyle = computed(() => ({
  padding: `${Number(style.value.boardEnabled ? style.value.boardPadding : 8)}px`,
  ...(style.value.boardEnabled ? {
    backgroundColor: String(style.value.boardBackgroundColor ?? 'var(--panel)'),
    borderColor: String(style.value.boardBorderColor ?? 'var(--border)'),
    borderWidth: `${Number(style.value.boardBorderWidth ?? 1)}px`,
    borderRadius: `${Number(style.value.boardRadius ?? 8)}px`,
  } : {}),
  '--component-title-color': String(style.value.boardTitleColor ?? 'var(--t2)'),
  '--component-title-size': `${Number(style.value.boardTitleSize ?? 13)}px`,
  '--component-title-accent': String(style.value.boardTitleAccentColor || 'transparent'),
  '--component-text-color': String(style.value.textColor ?? 'var(--t2)'),
  '--component-value-color': String(style.value.valueColor ?? 'var(--t1)'),
  '--component-border-color': String(style.value.boardBorderColor ?? 'var(--border)'),
}));
const hasTitleAccent = computed(() => Boolean(String(style.value.boardTitleAccentColor ?? '').trim()));

/** 告警等级色 */
function levelClass(value: unknown): string {
  const text = String(value);
  if (text.includes('严重')) {
    return 'lv-err';
  }
  if (text.includes('重要')) {
    return 'lv-warn';
  }
  return 'lv-pri';
}

/** 评价/状态类单元格（优秀、一般、异常…）渲染为彩色徽标，还原大屏常见的评级样式。 */
function ratingClass(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || text.length > 4) return '';
  if (/^(优秀|良好|正常|在线|合格|安全|已解决)$/.test(text)) return 'tag tag-ok';
  if (/^(一般|中等|警告|待处理|注意)$/.test(text)) return 'tag tag-warn';
  if (/^(异常|严重|离线|故障|不合格|差|危险|未解决)$/.test(text)) return 'tag tag-err';
  return '';
}
</script>

<template>
  <div class="tbl" :class="{ board: style.boardEnabled }" :style="panelStyle">
    <div v-if="style.boardEnabled && String(style.boardTitle ?? '').trim()" class="board-title" :class="{ 'board-title-accent': hasTitleAccent }">{{ style.boardTitle }}</div>
    <ComponentAccessories :style="style" :data="data" />
    <div v-if="!valid && mode === 'edit'" class="warn">静态数据不符合协议</div>
    <div v-else-if="!valid && mode === 'runtime'" class="fail">数据加载失败</div>
    <table v-else-if="table" class="cv-table" :class="{ stripe: style.stripe }">
      <thead>
        <tr>
          <th v-for="col in table.columns" :key="col.key">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in table.rows" :key="i">
          <td v-for="col in table.columns" :key="col.key">
            <span v-if="alarm && col.key === 'level'" class="dot" :class="levelClass(row[col.key])" />
            <span v-if="ratingClass(row[col.key])" :class="ratingClass(row[col.key])">{{ row[col.key] }}</span>
            <template v-else>{{ row[col.key] }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tbl { position: relative; width: 100%; height: 100%; overflow: auto; box-sizing: border-box; }
.tbl.board { border-style: solid; }
.board-title { display: flex; align-items: center; min-height: 28px; font-size: var(--component-title-size); color: var(--component-title-color); margin-bottom: 6px; }
.board-title-accent::before { content: ''; flex: none; width: 3px; height: 0.9em; margin-right: 8px; border-radius: 1px; background: var(--component-title-accent); }
.cv-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.cv-table th { text-align: left; padding: 8px; color: var(--component-text-color); background: color-mix(in srgb, var(--component-value-color) 6%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--component-text-color) 35%, transparent); font-weight: 500; }
.cv-table td { padding: 8px; border-bottom: 1px solid color-mix(in srgb, var(--component-text-color) 18%, transparent); color: var(--component-value-color); }
.cv-table.stripe tbody tr:nth-child(even) { background: rgba(22, 41, 78, .35); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.lv-err { background: var(--err); } .lv-warn { background: var(--warn); } .lv-pri { background: var(--pri); }
.tag { display: inline-block; min-width: 36px; padding: 2px 8px; border-radius: 2px; font-size: 12px; line-height: 1.4; text-align: center; }
.tag-ok { color: #22C55E; background: rgba(34, 197, 94, .14); }
.tag-warn { color: #F59E0B; background: rgba(245, 158, 11, .14); }
.tag-err { color: #EF4444; background: rgba(239, 68, 68, .14); }
.warn { color: var(--warn); font-size: 12px; }
.fail { color: var(--err); font-size: 12px; }
</style>
