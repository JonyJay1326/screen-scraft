<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { ComponentDoc } from '@screencraft/shared';
import { isProtocolValid } from '@screencraft/shared';
import {
  Activity, BellRing, Clock3, Droplets, Factory, Flame, Gauge, Network,
  Settings2, Thermometer, Timer, UsersRound, Waypoints, Zap,
} from 'lucide-vue-next';
import { getMeta } from '../meta-lookup';
import ComponentAccessories from './ComponentAccessories.vue';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const valid = computed(() => isProtocolValid(tpl.value?.dataProtocol, props.data));
const kind = computed(() => props.doc.templateId.replace('kpi-card-', ''));
interface KpiListItem { name: string; value: string }
const listData = computed<KpiListItem[]>(() => Array.isArray(props.data)
  ? props.data
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({ name: String(item.name ?? ''), value: String(item.value ?? '') }))
  : []);
const listGrid = computed(() => kind.value === 'list'
  && listData.value.length >= 4
  && listData.value.every((item) => item.value.includes('/')));
const analysisGroups = computed(() => {
  if (kind.value !== 'list') return [];
  const pressure = listData.value.filter((item) => item.name.includes('压差'));
  const temperature = listData.value.filter((item) => item.name.includes('温差'));
  return pressure.length >= 2 && temperature.length >= 2
    ? [
        { title: '车间压差分析', items: pressure },
        { title: '车间温差分析', items: temperature },
      ]
    : [];
});
const analysisSummary = computed(() => analysisGroups.value.length
  ? listData.value.find((item) => !item.name.includes('压差') && !item.name.includes('温差'))
  : undefined);
const isAlertList = computed(() => kind.value === 'list'
  && listData.value.length >= 2
  && listData.value.every((item) => item.name.includes('告警')));
const STATUS_NEGATIVE = /离线|故障|异常|停机|未解决|超限/;
const STATUS_POSITIVE = /总数|在线|正常|运行|已解决/;
/** 网关总数/在线/离线一类状态行：用状态圆点和状态色替代图标。 */
function statusTone(name: string): 'up' | 'down' | undefined {
  if (STATUS_NEGATIVE.test(name)) return 'down';
  if (STATUS_POSITIVE.test(name)) return 'up';
  return undefined;
}
const isStatusList = computed(() => kind.value === 'list'
  && !listGrid.value
  && !isAlertList.value
  && !analysisGroups.value.length
  && listData.value.length >= 2
  && listData.value.every((item) => statusTone(item.name) !== undefined));
function toneColor(tone: 'up' | 'down' | undefined): string | undefined {
  if (tone === 'up') return String(style.value.upColor ?? '#22C55E');
  if (tone === 'down') return String(style.value.downColor ?? '#EF4444');
  return undefined;
}
/** 设备类型卡片按数据项顺序循环使用系列色，还原多色图标。 */
const gridPalette = computed<string[]>(() => {
  const colors = Array.isArray(style.value.seriesColors) ? style.value.seriesColors.map(String).filter(Boolean) : [];
  return colors.length ? colors : [String(style.value.iconColor ?? '#3F7FF0')];
});
function gridIconStyle(index: number) {
  const color = gridPalette.value[index % gridPalette.value.length]!;
  return { color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` };
}
/**
 * 数值拆分为主值 + 弱化的附属部分：
 * “76% 120/156” → 76% / 120/156；“20/20” → 20 / /20；“320 ℃” → 320 / ℃。
 */
function splitRatio(value: string): { main: string; rest: string } {
  const text = value.trim();
  const withRatio = text.match(/^(\S+)\s+(\S+\/\S+)$/);
  if (withRatio) return { main: withRatio[1]!, rest: withRatio[2]! };
  const ratio = text.match(/^([^/\s]+)\s*(\/.*)$/);
  if (ratio) return { main: ratio[1]!, rest: ratio[2]!.replace(/^\/\s*/, '/') };
  const unit = text.match(/^([-+]?\d[\d,.]*%?)\s*(.+)$/);
  if (unit) return { main: unit[1]!, rest: unit[2]! };
  return { main: text, rest: '' };
}
const aspect = computed(() => props.doc.w / Math.max(props.doc.h, 1));
/** 指标列表布局：显式配置优先；自动模式下根据数据形态与组件长宽比推断。 */
const listLayout = computed<'rows' | 'grid'>(() => {
  if (kind.value !== 'list') return 'rows';
  const configured = String(style.value.listLayout ?? 'auto');
  if (configured === 'rows' || configured === 'grid') return configured;
  if (listGrid.value) return 'grid';
  if (isStatusList.value || isAlertList.value || analysisGroups.value.length) return 'rows';
  const count = listData.value.length;
  if (aspect.value >= 2.5 && count >= 2 && count <= 8) return 'grid';
  if (String(style.value.iconName ?? 'none') !== 'none' && count >= 4) return 'grid';
  return 'rows';
});
const gridColumns = computed(() => {
  const count = listData.value.length;
  if (listGrid.value) return 2;
  // 宽而矮的列表：4 项以内单行铺开，更多则折成两行
  if (aspect.value >= 2.5 && count <= 8) return count <= 4 ? count : Math.ceil(count / 2);
  return 3;
});
/** 逐行列表中的百分比值渲染为进度条（如良品率 89%）。 */
function percentOf(value: string): number | undefined {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (!match) return undefined;
  return Math.max(0, Math.min(100, Number(match[1])));
}
const rowsHaveProgress = computed(() => listLayout.value === 'rows'
  && !isStatusList.value && !isAlertList.value
  && listData.value.length >= 2
  && listData.value.filter((item) => percentOf(item.value) !== undefined).length >= Math.ceil(listData.value.length / 2));
/** 3 列网格余 1 项时，首项作为头条指标独占一行放大展示（如“管网长度”）。 */
const gridHeadline = computed(() => listLayout.value === 'grid'
  && !listGrid.value
  && gridColumns.value === 3
  && listData.value.length % 3 === 1);
/** 压差/温差对比徽标：值内带箭头时按箭头方向，否则沿用参考截图惯例（压差下降为好、温差上升为差）。 */
function compareBadge(groupTitle: string, value: string): { arrow: string; color: string; text: string } {
  const text = value.replace(/[↑↓▲▼+\-\s]/g, '');
  const explicitUp = /[↑▲+]/.test(value);
  const explicitDown = /[↓▼-]/.test(value);
  const up = explicitUp || (!explicitDown && groupTitle.includes('温差'));
  return {
    arrow: up ? '▲' : '▼',
    color: up ? String(style.value.downColor ?? '#EF4444') : String(style.value.upColor ?? '#22C55E'),
    text,
  };
}
const iconComponents: Record<string, Component> = {
  activity: Activity,
  alarm: BellRing,
  clock: Clock3,
  droplets: Droplets,
  factory: Factory,
  gauge: Gauge,
  network: Network,
  pressure: Gauge,
  temperature: Thermometer,
  timer: Timer,
  users: UsersRound,
  valve: Settings2,
  zap: Zap,
};
const iconStyle = computed(() => ({
  color: String(style.value.iconColor ?? 'var(--pri)'),
  backgroundColor: String(style.value.iconBackgroundColor ?? 'color-mix(in srgb, var(--pri) 18%, transparent)'),
}));

function resolveIcon(label: string): Component | undefined {
  const configured = String(style.value.iconName ?? 'none');
  if (configured === 'none') return undefined;
  if (configured !== 'auto') return iconComponents[configured];
  if (/告警|故障|异常/.test(label)) return BellRing;
  if (/运行时间|时钟/.test(label)) return Clock3;
  if (/时间|时长/.test(label)) return Timer;
  if (/班组|人员|用户/.test(label)) return UsersRound;
  if (/温度|温差/.test(label)) return Thermometer;
  if (/压力|压差/.test(label)) return Gauge;
  if (/阀/.test(label)) return Settings2;
  if (/网关|网络|在线|离线/.test(label)) return Network;
  if (/管网|管道|长度/.test(label)) return Waypoints;
  if (/电|能耗|功率/.test(label)) return Zap;
  if (/供汽|用汽|蒸汽/.test(label)) return Flame;
  if (/汽|水|流量/.test(label)) return Droplets;
  if (/车间|厂区|产量/.test(label)) return Factory;
  return Activity;
}
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
</script>

<template>
  <div class="kpi" :class="{ board: style.boardEnabled }" :style="panelStyle">
    <div v-if="style.boardEnabled && style.boardTitle" class="board-title" :class="{ 'board-title-accent': hasTitleAccent }">{{ style.boardTitle }}</div>
    <ComponentAccessories :style="style" :data="data" />
    <div v-if="!valid && mode === 'edit'" class="warn">静态数据不符合协议</div>
    <div v-else-if="!valid && mode === 'runtime'" class="fail">数据加载失败</div>
    <template v-else>
      <div v-if="kind === '1' && Array.isArray(data)" class="kpi1">
        <div v-for="(item, i) in data as Record<string, string | number>[]" :key="i" class="kpi1-item">
          <div v-if="resolveIcon(String(item.name))" class="k-icon" :style="iconStyle">
            <component :is="resolveIcon(String(item.name))" :size="24" :stroke-width="1.8" />
          </div>
          <div class="kpi1-content">
            <div class="k-val" :style="{ fontSize: style.valueSize + 'px' }">{{ item.value }}<small>{{ item.unit }}</small></div>
            <div class="k-label">{{ item.name }}</div>
            <div v-if="Number(item.trend) !== 0" class="k-trend" :style="{ color: item.trendDir === 'down' ? String(style.downColor) : String(style.upColor) }">
              {{ item.trendDir === 'down' ? '↓' : '↑' }} {{ item.trend }}%
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="(kind === '2' || kind === '10' || kind === '11') && Array.isArray(data)" class="kpi2">
        <div v-for="(item, i) in data as Record<string, string | number>[]" :key="i" class="kpi2-cell">
          <div class="k-label">{{ item.name }}</div>
          <div class="k-val" :style="{ fontSize: style.valueSize + 'px' }">{{ item.value }}<small>{{ item.unit }}</small></div>
          <div v-if="item.percent !== undefined" class="bar"><i :style="{ width: Number(item.percent) + '%' }" /></div>
        </div>
      </div>
      <div v-else-if="kind === '3' && data && typeof data === 'object'" class="kpi3">
        <div class="center">
          <div class="center-inner">
            <b class="k-val" :style="{ fontSize: style.valueSize + 'px' }">{{ (data as { center: { value: string } }).center.value }}</b>
            <span class="k-label">{{ (data as { center: { name: string } }).center.name }}</span>
          </div>
        </div>
        <div class="sides">
          <div v-for="(s, i) in (data as { sides: { name: string; percent: number }[] }).sides" :key="i" class="side-row">
            <span class="k-label">{{ s.name }}</span>
            <strong>{{ s.percent }}%</strong>
          </div>
        </div>
      </div>
      <div v-else-if="kind === '5' && data && typeof data === 'object'" class="kpi5">
        <div class="k-label">{{ (data as { name: string }).name }}</div>
        <div class="k-val" :style="{ fontSize: style.valueSize + 'px' }">
          {{ (data as { value: string }).value }}<small>{{ (data as { unit: string }).unit }}</small>
        </div>
      </div>
      <div v-else-if="(kind === '8') && Array.isArray(data)" class="kpi8">
        <div v-for="(item, i) in data as Record<string, string>[]" :key="i" class="kpi8-cell">
          <div class="k-label">{{ item.name }}</div>
          <div class="k-val" :style="{ fontSize: style.valueSize + 'px' }">{{ item.value }}<small>{{ item.unit }}</small></div>
        </div>
      </div>
      <div v-else-if="analysisGroups.length" class="analysis-list">
        <div v-if="analysisSummary" class="analysis-summary">
          <span class="k-label">{{ analysisSummary.name }}</span>
          <div class="analysis-summary-line">
            <div class="analysis-progress" aria-hidden="true"><i /></div>
            <b class="k-val">{{ analysisSummary.value }}</b>
          </div>
        </div>
        <section v-for="group in analysisGroups" :key="group.title" class="analysis-group">
          <h4>{{ group.title }}</h4>
          <div class="analysis-metrics">
            <div v-for="item in group.items" :key="item.name" class="analysis-metric">
              <span
                v-if="/对比/.test(item.name)"
                class="analysis-badge"
                :style="{ color: compareBadge(group.title, item.value).color, backgroundColor: `color-mix(in srgb, ${compareBadge(group.title, item.value).color} 14%, transparent)` }"
              >{{ compareBadge(group.title, item.value).arrow }} {{ compareBadge(group.title, item.value).text }}</span>
              <b v-else class="k-val">{{ item.value }}</b>
              <span class="k-label">{{ item.name }}</span>
            </div>
          </div>
        </section>
      </div>
      <ul
        v-else-if="kind === 'list' && listLayout === 'grid'"
        class="klist klist-grid"
        :class="{ 'klist-grid-plain': !listGrid }"
        :style="{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }"
      >
        <li v-for="(item, i) in listData" :key="i" :class="{ 'klist-headline': gridHeadline && i === 0 }">
          <span v-if="resolveIcon(item.name)" class="k-icon k-icon-sm" :style="gridIconStyle(i)">
            <component :is="resolveIcon(item.name)" :size="17" :stroke-width="1.8" />
          </span>
          <span class="klist-grid-body">
            <span class="k-label">{{ item.name }}</span>
            <b class="k-val">{{ splitRatio(item.value).main }}<small v-if="splitRatio(item.value).rest">{{ splitRatio(item.value).rest }}</small></b>
          </span>
        </li>
      </ul>
      <ul v-else-if="kind === 'list' && Array.isArray(data)" class="klist" :class="{ 'klist-alert': isAlertList, 'klist-status': isStatusList, 'klist-progress': rowsHaveProgress }">
        <li v-for="(item, i) in listData" :key="i">
          <span class="klist-main">
            <i v-if="isStatusList" class="status-dot" :style="{ backgroundColor: toneColor(statusTone(item.name)) }" />
            <span v-else-if="resolveIcon(item.name)" class="k-icon k-icon-sm" :style="iconStyle">
              <component :is="resolveIcon(item.name)" :size="17" :stroke-width="1.8" />
            </span>
            <span class="k-label">{{ item.name }}</span>
          </span>
          <span v-if="rowsHaveProgress && percentOf(item.value) !== undefined" class="klist-bar" aria-hidden="true">
            <i :style="{ width: `${percentOf(item.value)}%`, backgroundColor: gridPalette[i % gridPalette.length] }" />
          </span>
          <b class="k-val" :style="isStatusList ? { color: toneColor(statusTone(item.name)) } : undefined">{{ item.value }}</b>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.kpi {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  color: var(--t1);
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.kpi.board { border-style: solid; }
.board-title {
  flex: none;
  display: flex;
  align-items: center;
  font-size: var(--component-title-size);
  line-height: 1.2;
  color: var(--component-title-color);
  margin-bottom: 10px;
}
.board-title-accent::before {
  content: '';
  flex: none;
  width: 3px;
  height: 0.9em;
  margin-right: 8px;
  border-radius: 1px;
  background: var(--component-title-accent);
}
.k-label {
  font-size: 12px;
  line-height: 1.2;
  color: var(--component-text-color);
}
.k-val {
  color: var(--component-value-color);
  font-family: var(--font-num);
  font-weight: 700;
  line-height: 1;
}
.k-val small {
  font-size: 12px;
  margin-left: 4px;
  color: var(--component-text-color);
  font-weight: 400;
  line-height: 1;
}
.k-trend {
  font-size: 12px;
  line-height: 1.2;
}

.kpi1 {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.kpi1-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.kpi1-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.k-icon {
  flex: none;
  width: 54px;
  height: 54px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.k-icon-sm {
  width: 34px;
  height: 34px;
}
.klist-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.kpi2,
.kpi8 {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}
.kpi2-cell,
.kpi8-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  background: var(--panel2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 14px;
  box-sizing: border-box;
}
.bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--pri);
}

.kpi3 {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 20px;
}
.center {
  flex: none;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid var(--pri);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.center-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
}
.sides {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
}
.side-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.side-row strong {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 700;
  color: var(--acc);
  line-height: 1;
}

.kpi5 {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.klist {
  flex: 1;
  min-height: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.klist-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 10px;
}
.klist-grid li {
  min-height: 58px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--component-text-color) 12%, transparent);
  border-radius: 3px;
  background: color-mix(in srgb, var(--component-value-color) 5%, transparent);
}
.klist-grid-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.klist-grid .k-val { font-size: 20px; }
.klist-grid .k-val small {
  margin-left: 3px;
  font-size: 12px;
  font-weight: 400;
  color: var(--component-text-color);
}
.klist-grid-plain {
  align-content: stretch;
  gap: 8px;
}
.klist-grid-plain li {
  min-height: 0;
  padding: 8px 10px;
  border-color: color-mix(in srgb, var(--component-text-color) 8%, transparent);
  background: color-mix(in srgb, var(--component-value-color) 4%, transparent);
}
.klist-grid-plain .k-val { font-size: 18px; }
.klist-headline {
  grid-column: 1 / -1;
}
.klist-headline .klist-grid-body {
  flex-direction: row;
  align-items: baseline;
  gap: 12px;
}
.klist-headline .k-val { font-size: 24px; }
.klist li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.klist li .k-val {
  font-size: 14px;
}
.klist-progress li {
  flex: 1 1 0;
  min-height: 0;
  gap: 10px;
  border-bottom: 0;
}
.klist-progress .klist-main { flex: 0 0 34%; min-width: 0; }
.klist-progress .k-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.klist-progress .k-val { flex: none; min-width: 44px; text-align: right; }
.klist-bar {
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: color-mix(in srgb, var(--component-text-color) 16%, transparent);
}
.klist-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
}
.klist-status li {
  flex: 1 1 0;
  min-height: 0;
  border-bottom-color: color-mix(in srgb, var(--component-text-color) 14%, transparent);
}
.klist-status li:last-child { border-bottom: 0; }
.status-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.klist-alert {
  gap: 10px;
}
.klist-alert li {
  position: relative;
  min-height: 52px;
  padding: 10px 14px 10px 18px;
  border: 0;
  border-radius: 3px;
  background: color-mix(in srgb, #c94848 10%, transparent);
  overflow: hidden;
}
.klist-alert li::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: #c94848;
}
.klist-alert li .k-val {
  font-size: 22px;
}
.analysis-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.analysis-summary {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 16px;
  border-bottom: 1px solid var(--border);
}
.analysis-summary-line {
  display: flex;
  align-items: center;
  gap: 12px;
}
.analysis-summary .k-val {
  flex: none;
  font-size: 18px;
}
.analysis-progress {
  flex: 1;
  min-width: 0;
  height: 12px;
  border-radius: 2px;
  overflow: hidden;
  background: repeating-linear-gradient(90deg, var(--component-border-color) 0 5px, transparent 5px 8px);
}
.analysis-progress i {
  display: block;
  width: 78%;
  height: 100%;
  background: repeating-linear-gradient(90deg, var(--pri) 0 5px, transparent 5px 8px);
}
.analysis-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin: 0 auto 7px;
  padding: 3px 8px;
  border-radius: 2px;
  font-family: var(--font-num);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}
.analysis-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: 1px solid color-mix(in srgb, var(--component-border-color) 70%, transparent);
}
.analysis-group:last-child { border-bottom: 0; }
.analysis-group h4 {
  margin: 0 0 9px;
  color: var(--component-title-color);
  font-size: 13px;
  font-weight: 500;
}
.analysis-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: color-mix(in srgb, var(--component-value-color) 4%, transparent);
  border-radius: 3px;
}
.analysis-metric {
  min-width: 0;
  padding: 12px 10px;
  text-align: center;
  border-right: 1px solid var(--border);
}
.analysis-metric:last-child {
  border-right: 0;
}
.analysis-metric .k-val {
  display: block;
  margin-bottom: 7px;
  font-size: 20px;
}
.analysis-metric .k-label {
  display: block;
  white-space: normal;
}

.warn,
.fail {
  font-size: 12px;
}
.warn {
  color: var(--warn);
}
.fail {
  color: var(--err);
}
</style>
