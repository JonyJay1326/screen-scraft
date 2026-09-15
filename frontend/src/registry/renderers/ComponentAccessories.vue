<script setup lang="ts">
import { computed } from 'vue';
import { CalendarDays } from 'lucide-vue-next';

const props = defineProps<{
  style: Record<string, unknown>;
  data?: unknown;
}>();

const hasToolbar = computed(() => Boolean(
  props.style.showPeriodTabs || props.style.showDateRange || String(props.style.actionText ?? '').trim(),
));
const seriesNames = computed(() => {
  if (!props.data || typeof props.data !== 'object' || !('series' in props.data)) return [];
  const series = (props.data as { series?: unknown }).series;
  return Array.isArray(series)
    ? series.slice(0, 2).map((item, index) => (
        item && typeof item === 'object' && 'name' in item ? String(item.name) : `系列${index + 1}`
      ))
    : [];
});
/** 提示框贴到 tooltipTitle 对应的类目位置；与 chart-option 的默认 grid(left 48/right 24) 保持一致。 */
const tooltipPosition = computed(() => {
  const fallback = { left: '54%', top: '48%' };
  if (!props.data || typeof props.data !== 'object' || !('categories' in props.data)) return fallback;
  const categories = (props.data as { categories?: unknown }).categories;
  const title = String(props.style.tooltipTitle ?? '').trim();
  if (!Array.isArray(categories) || !categories.length || !title) return fallback;
  const index = categories.findIndex((item) => String(item) === title);
  if (index < 0) return fallback;
  const ratio = (index + 0.5) / categories.length;
  return { left: `calc(48px + (100% - 72px) * ${ratio.toFixed(4)} + 12px)`, top: '44%' };
});
</script>

<template>
  <div v-if="hasToolbar" class="component-toolbar" aria-hidden="true">
    <div v-if="style.showDateRange" class="date-range">
      <CalendarDays :size="14" :stroke-width="1.7" />
      <span class="date-label">{{ style.dateRangeLabel }}</span>
      <span class="date-field">{{ style.dateStartText }}</span>
      <i>–</i>
      <span class="date-field">{{ style.dateEndText }}</span>
    </div>
    <div v-if="style.showPeriodTabs" class="period-tabs">
      <span v-for="tab in ['日', '月', '年']" :key="tab" :class="{ active: style.activePeriodTab === tab }">{{ tab }}</span>
    </div>
    <span v-if="String(style.actionText ?? '').trim()" class="action-text">{{ style.actionText }}</span>
  </div>

  <div v-if="style.showDemoTooltip" class="demo-tooltip" :style="tooltipPosition" aria-hidden="true">
    <strong>{{ style.tooltipTitle }}</strong>
    <div v-if="String(style.tooltipPrimaryValue ?? '').trim()">
      <i class="dot primary" />
      <span>{{ seriesNames[0] || '系列一' }}</span>
      <b>{{ style.tooltipPrimaryValue }}</b>
    </div>
    <div v-if="String(style.tooltipSecondaryValue ?? '').trim()">
      <i class="dot secondary" />
      <span>{{ seriesNames[1] || '系列二' }}</span>
      <b>{{ style.tooltipSecondaryValue }}</b>
    </div>
  </div>
</template>

<style scoped>
.component-toolbar {
  position: absolute;
  z-index: 3;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  max-width: calc(100% - 120px);
  color: var(--component-text-color, var(--t2));
  font-size: 12px;
  line-height: 1;
  pointer-events: none;
}
.period-tabs,
.date-range {
  display: flex;
  align-items: center;
  height: 28px;
  border: 1px solid var(--component-border-color, var(--border));
  border-radius: 3px;
  background: color-mix(in srgb, var(--component-value-color, var(--t1)) 3%, transparent);
  box-sizing: border-box;
}
.period-tabs span {
  min-width: 28px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid var(--component-border-color, var(--border));
}
.period-tabs span:first-child { border-left: 0; }
.period-tabs .active {
  color: var(--pri);
  background: color-mix(in srgb, var(--pri) 14%, transparent);
}
.date-range { padding-left: 9px; gap: 7px; }
.date-label { color: var(--component-text-color, var(--t2)); }
.date-field {
  min-width: 72px;
  padding: 0 8px;
  color: var(--component-text-color, var(--t2));
  opacity: .8;
}
.date-range i { font-style: normal; opacity: .5; }
.action-text { padding: 6px 2px; color: var(--component-text-color, var(--t2)); }
.demo-tooltip {
  position: absolute;
  z-index: 3;
  min-width: 138px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--component-value-color, var(--t1)) 10%, transparent);
  border-radius: 3px;
  background: #292c33;
  color: var(--component-text-color, var(--t2));
  box-shadow: 0 8px 24px rgba(0, 0, 0, .24);
  font-size: 12px;
  pointer-events: none;
}
.demo-tooltip strong { display: block; margin-bottom: 9px; color: var(--component-value-color, var(--t1)); font-weight: 500; }
.demo-tooltip div { display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 7px; margin-top: 7px; }
.demo-tooltip b { color: var(--component-value-color, var(--t1)); font-family: var(--font-num); font-size: 15px; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.dot.primary { background: var(--pri); }
.dot.secondary { background: var(--acc); }
</style>
