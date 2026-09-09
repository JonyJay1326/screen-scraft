import { validateAiStylePatch, type ComponentDoc, type SafeChartSpec } from '@screencraft/shared';
import { buildChartOption } from './chart-option';

const DARK_PALETTE = ['#2F7FF7', '#35E0FF', '#7C5CFC', '#22C55E', '#F59E0B'];
const LIGHT_PALETTE = ['#2F7FF7', '#0EA5E9', '#7C3AED', '#16A34A', '#D97706'];

export function buildSafeChartOption(doc: ComponentDoc, data: unknown): Record<string, unknown> {
  const definition = doc.definitionSnapshot!;
  const spec = definition.safeSpec as SafeChartSpec;
  const baseStyle = specStyle(spec, doc.theme);
  const instanceStyle = Object.fromEntries(
    Object.entries(doc.style).filter(([key, value]) => (
      validateAiStylePatch(definition.styleSchema, { [key]: value }).length === 0
    )),
  );
  const editableStyle = definition.styleMode === 'editable'
    ? { ...definition.defaultStyle[doc.theme], ...instanceStyle }
    : {};
  const style = normalizeCrossFieldStyle({ ...baseStyle, ...editableStyle }, spec);
  const option = buildChartOption({
    templateId: `chart-${spec.family}-safe`,
    protocol: definition.dataProtocol,
    style,
    data,
  });
  applySafeOverrides(option, spec, style);
  return option;
}

function normalizeCrossFieldStyle(
  style: Record<string, unknown>,
  spec: SafeChartSpec,
): Record<string, unknown> {
  if (spec.family === 'pie') {
    const inner = Number(style.innerRadius);
    const outer = Number(style.outerRadius);
    if (!Number.isFinite(inner) || !Number.isFinite(outer) || inner >= outer) {
      style.innerRadius = spec.option.pie?.innerRadius ?? 0;
      style.outerRadius = spec.option.pie?.outerRadius ?? 70;
    }
  }
  if (spec.family === 'gauge') {
    const min = Number(style.gaugeMin);
    const max = Number(style.gaugeMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      style.gaugeMin = spec.option.gauge?.min ?? 0;
      style.gaugeMax = spec.option.gauge?.max ?? 100;
    }
  }
  return style;
}

function specStyle(spec: SafeChartSpec, theme: 'dark' | 'light'): Record<string, unknown> {
  const option = spec.option;
  return {
    seriesColors: option.palette ?? (theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE),
    showLegend: option.legend?.show ?? true,
    legendPosition: option.legend?.position ?? 'top',
    showXAxis: option.axis?.showX ?? true,
    showYAxis: option.axis?.showY ?? true,
    axisLabelColor: option.axis?.labelColor ?? (theme === 'dark' ? '#9FB3D1' : '#5B6B82'),
    gridColor: option.axis?.gridColor ?? (theme === 'dark' ? '#23395D' : '#DCE6F2'),
    lineSmooth: option.line?.smooth ?? false,
    lineWidth: option.line?.width ?? 2,
    areaOpacity: (option.line?.areaOpacity ?? option.radar?.areaOpacity ?? 0) * 100,
    showSymbol: option.line?.symbol !== 'none',
    barWidth: option.bar?.width ?? 36,
    barRadius: option.bar?.radius ?? 0,
    stack: option.bar?.stack ?? false,
    horizontal: option.bar?.horizontal ?? false,
    innerRadius: option.pie?.innerRadius ?? 0,
    outerRadius: option.pie?.outerRadius ?? 70,
    roseType: option.pie?.roseType ?? 'none',
    funnelSort: option.funnel?.sort ?? 'descending',
    funnelAlign: option.funnel?.align ?? 'center',
    funnelGap: option.funnel?.gap ?? 2,
    radarShape: option.radar?.shape ?? 'polygon',
    splitNumber: option.radar?.splitNumber ?? (option.gauge ? 10 : 5),
    gaugeMin: option.gauge?.min ?? 0,
    gaugeMax: option.gauge?.max ?? 100,
    gaugeStartAngle: option.gauge?.startAngle ?? 225,
    gaugeEndAngle: option.gauge?.endAngle ?? -45,
    showPointer: option.gauge?.showPointer ?? true,
    showProgress: option.gauge?.showProgress ?? false,
    showLabel: true,
  };
}

function applySafeOverrides(
  rendered: Record<string, unknown>,
  spec: SafeChartSpec,
  style: Record<string, unknown>,
): void {
  if (spec.option.grid && rendered.grid && typeof rendered.grid === 'object') {
    Object.assign(rendered.grid, spec.option.grid, { containLabel: true });
  }
  const series = Array.isArray(rendered.series) ? rendered.series as Array<Record<string, unknown>> : [];
  if (spec.family === 'line' || spec.family === 'combo' || spec.family === 'radar') {
    series.forEach((item) => {
      if (item.type === 'line' || item.type === 'radar') {
        item.symbol = spec.option.line?.symbol ?? (style.showSymbol ? 'circle' : 'none');
      }
    });
  }
  if (spec.family === 'bar' || spec.family === 'combo') {
    series.forEach((item) => {
      if (item.type === 'bar') {
        item.itemStyle = { borderRadius: Number(style.barRadius ?? spec.option.bar?.radius ?? 0) };
      }
    });
  }
  if (spec.family === 'pie' && series[0]) {
    const inner = Number(style.innerRadius ?? spec.option.pie?.innerRadius ?? 0);
    const outer = Number(style.outerRadius ?? spec.option.pie?.outerRadius ?? 70);
    series[0].radius = inner > 0 ? [`${inner}%`, `${outer}%`] : `${outer}%`;
    const roseType = String(style.roseType ?? spec.option.pie?.roseType ?? 'none');
    series[0].roseType = roseType === 'none' ? undefined : roseType;
  }
}
