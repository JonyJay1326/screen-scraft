<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import { getMeta } from '../meta-lookup';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const valid = computed(() => isProtocolValid(tpl.value?.dataProtocol, props.data));
const kind = computed(() => props.doc.templateId.replace('kpi-card-', ''));
</script>

<template>
  <div class="kpi" :class="{ board: style.boardEnabled }" :style="{ padding: (style.boardEnabled ? style.boardPadding : 8) + 'px' }">
    <div v-if="style.boardEnabled" class="board-title">{{ style.boardTitle }}</div>
    <div v-if="!valid && mode === 'edit'" class="warn">静态数据不符合协议</div>
    <div v-else-if="!valid && mode === 'runtime'" class="fail">数据加载失败</div>
    <template v-else>
      <div v-if="kind === '1' && Array.isArray(data)" class="kpi1">
        <div v-for="(item, i) in data as Record<string, string | number>[]" :key="i">
          <div class="k-label">{{ item.name }}</div>
          <div class="k-val" :style="{ fontSize: style.valueSize + 'px' }">{{ item.value }}<small>{{ item.unit }}</small></div>
          <div class="k-trend" :style="{ color: item.trendDir === 'down' ? String(style.downColor) : String(style.upColor) }">
            {{ item.trendDir === 'down' ? '↓' : '↑' }} {{ item.trend }}%
          </div>
        </div>
      </div>
      <div v-else-if="(kind === '2' || kind === '2p' || kind === '10' || kind === '11') && Array.isArray(data)" class="kpi2">
        <div v-for="(item, i) in data as Record<string, string | number>[]" :key="i" class="kpi2-cell">
          <div class="k-label">{{ item.name }}</div>
          <div class="k-val" :style="{ fontSize: style.valueSize + 'px' }">{{ item.value }}<small>{{ item.unit }}</small></div>
          <div v-if="item.percent !== undefined" class="bar"><i :style="{ width: Number(item.percent) + '%' }" /></div>
        </div>
      </div>
      <div v-else-if="(kind === '3' || kind === '3p') && data && typeof data === 'object'" class="kpi3">
        <div class="center">
          <b :style="{ fontSize: style.valueSize + 'px' }">{{ (data as { center: { value: string; name: string } }).center.value }}</b>
          <span>{{ (data as { center: { name: string } }).center.name }}</span>
        </div>
        <div class="sides">
          <div v-for="(s, i) in (data as { sides: { name: string; percent: number }[] }).sides" :key="i">
            <span>{{ s.name }}</span><strong>{{ s.percent }}%</strong>
          </div>
        </div>
      </div>
      <div v-else-if="(kind === '5' || kind === '5p') && data && typeof data === 'object'" class="kpi5">
        <div class="k-label">{{ (data as { name: string }).name }}</div>
        <div class="k-val" :style="{ fontSize: style.valueSize + 'px' }">
          {{ (data as { value: string }).value }}<small>{{ (data as { unit: string }).unit }}</small>
        </div>
      </div>
      <div v-else-if="(kind === '8' || kind === '9') && Array.isArray(data)" class="kpi8">
        <div v-for="(item, i) in data as Record<string, string>[]" :key="i" class="kpi8-cell">
          <div class="k-label">{{ item.name }}</div>
          <div class="k-val">{{ item.value }}<small>{{ item.unit }}</small></div>
        </div>
      </div>
      <ul v-else-if="kind === 'list' && Array.isArray(data)" class="klist">
        <li v-for="(item, i) in data as { name: string; value: string }[]" :key="i">
          <span>{{ item.name }}</span><b>{{ item.value }}</b>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.kpi { width: 100%; height: 100%; box-sizing: border-box; color: var(--t1); display: flex; flex-direction: column; }
.kpi.board { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; }
.board-title { font-size: 13px; color: var(--t2); margin-bottom: 6px; }
.k-label { font-size: 12px; color: var(--t2); }
.k-val { font-family: var(--font-num); font-weight: 700; line-height: 1.1; }
.k-val small { font-size: 12px; margin-left: 4px; color: var(--t2); font-weight: 400; }
.k-trend { font-size: 12px; margin-top: 4px; }
.kpi2, .kpi8 { display: flex; gap: 10px; height: 100%; }
.kpi2-cell, .kpi8-cell { flex: 1; background: var(--panel2); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; }
.bar { height: 4px; background: var(--border); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--pri); }
.kpi3 { display: flex; gap: 16px; align-items: center; height: 100%; }
.center { width: 140px; height: 140px; border-radius: 50%; border: 3px solid var(--pri); display: grid; place-items: center; text-align: center; }
.center span { display: block; font-size: 12px; color: var(--t2); }
.sides { display: flex; flex-direction: column; gap: 8px; }
.sides strong { margin-left: 8px; color: var(--acc); }
.klist { list-style: none; }
.klist li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.warn, .fail { font-size: 12px; }
.warn { color: var(--warn); }
.fail { color: var(--err); }
</style>
