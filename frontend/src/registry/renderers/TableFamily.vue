<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentDoc, TableData } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { getMeta } from '../meta-lookup';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const valid = computed(() => isProtocolValid('table', props.data));
const table = computed(() => props.data as TableData | undefined);
const alarm = computed(() => props.doc.templateId === 'table-alarm');

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
</script>

<template>
  <div class="tbl" :class="{ board: style.boardEnabled }" :style="{ padding: (style.boardEnabled ? style.boardPadding : 8) + 'px' }">
    <div v-if="style.boardEnabled" class="board-title">{{ style.boardTitle }}</div>
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
            {{ row[col.key] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tbl { width: 100%; height: 100%; overflow: auto; box-sizing: border-box; }
.tbl.board { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; }
.board-title { font-size: 13px; color: var(--t2); margin-bottom: 6px; }
.cv-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.cv-table th { text-align: left; padding: 8px; color: var(--t2); background: var(--panel2); border-bottom: 1px solid var(--border); }
.cv-table td { padding: 8px; border-bottom: 1px solid var(--border); color: var(--t1); }
.cv-table.stripe tbody tr:nth-child(even) { background: rgba(22, 41, 78, .35); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.lv-err { background: var(--err); } .lv-warn { background: var(--warn); } .lv-pri { background: var(--pri); }
.warn { color: var(--warn); font-size: 12px; }
.fail { color: var(--err); font-size: 12px; }
</style>
