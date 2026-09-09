import {
  validateAiStylePatch,
  type ComponentDoc,
  type SafeChartColor,
  type SafeChartSpec,
  type SafeChartSpecV2,
  type SafeChartVisualObject,
  type SafeChartVisualOverrides,
} from '@screencraft/shared';
import { buildChartOption } from './chart-option';

const DARK_PALETTE = ['#2F7FF7', '#35E0FF', '#7C5CFC', '#22C55E', '#F59E0B'];
const LIGHT_PALETTE = ['#2F7FF7', '#0EA5E9', '#7C3AED', '#16A34A', '#D97706'];
const VISUAL_MERGE_BLOCKED_KEYS = new Set([
  '__proto__', 'prototype', 'constructor', 'data', 'dataset', 'series', 'indicator', 'graphic',
  'media', 'toolbox', 'visualMap', 'geo', 'calendar', 'renderItem', 'script', 'html', 'css',
  'svg', 'path', 'url', 'href', 'src', 'image', 'link', 'sublink',
  'coordinateSystem', 'encode', 'dimensions', 'datasetIndex', 'datasetId',
]);

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
    lineWidth: option.line?.width ?? (spec.schemaVersion === 2 ? spec.option.radar?.lineWidth : undefined) ?? 2,
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
  if (spec.schemaVersion === 2) {
    applyV2Overrides(rendered, spec, style);
    return;
  }
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

function applyV2Overrides(
  rendered: Record<string, unknown>,
  spec: SafeChartSpecV2,
  style: Record<string, unknown>,
): void {
  const option = spec.option;
  rendered.backgroundColor = option.backgroundColor;
  if (option.grid && isRecord(rendered.grid)) {
    Object.assign(rendered.grid, option.grid);
  }
  if (option.legend && isRecord(rendered.legend)) {
    const legend = rendered.legend;
    Object.assign(legend, {
      show: Boolean(style.showLegend ?? option.legend.show),
      orient: option.legend.orientation,
      icon: option.legend.icon,
      itemWidth: option.legend.itemWidth,
      itemHeight: option.legend.itemHeight,
      itemGap: option.legend.gap,
      textStyle: { color: option.legend.textColor, fontSize: option.legend.textSize },
    });
    applyLegendPosition(legend, String(style.legendPosition ?? option.legend.position));
  }
  if (option.axis) {
    const axisOption = option.axis;
    const axes = [rendered.xAxis, rendered.yAxis].flatMap((axis) => Array.isArray(axis) ? axis : axis ? [axis] : []);
    axes.forEach((axis, index) => {
      if (!isRecord(axis)) return;
      const isXAxis = axis === rendered.xAxis || (Array.isArray(rendered.xAxis) && rendered.xAxis.includes(axis));
      axis.show = isXAxis
        ? Boolean(style.showXAxis ?? axisOption.showX)
        : Boolean(style.showYAxis ?? axisOption.showY);
      axis.axisLabel = {
        ...(isRecord(axis.axisLabel) ? axis.axisLabel : {}),
        color: String(style.axisLabelColor ?? axisOption.labelColor),
        fontSize: axisOption.labelSize,
        rotate: axisOption.labelRotate,
      };
      axis.axisTick = { show: axisOption.showTicks };
      axis.axisLine = {
        show: axisOption.axisLineWidth > 0,
        lineStyle: { color: axisOption.axisLineColor, width: axisOption.axisLineWidth },
      };
      axis.splitLine = {
        ...(isRecord(axis.splitLine) ? axis.splitLine : {}),
        lineStyle: {
          color: String(style.gridColor ?? axisOption.gridColor),
          width: axisOption.gridWidth,
          type: axisOption.gridType,
        },
      };
      if (index > 0 && Array.isArray(rendered.yAxis)) {
        axis.splitLine = { show: false };
      }
    });
  }

  const series = Array.isArray(rendered.series) ? rendered.series.filter(isRecord) : [];
  series.forEach((item) => {
    if (item.type === 'line' && option.line) {
      item.smooth = Boolean(style.lineSmooth ?? option.line.smooth);
      item.symbol = style.showSymbol === false ? 'none' : option.line.symbol;
      item.symbolSize = option.line.symbolSize;
      item.lineStyle = {
        width: Number(style.lineWidth ?? option.line.width),
        type: option.line.lineType,
      };
      item.areaStyle = option.line.areaOpacity > 0
        ? {
            opacity: Number(style.areaOpacity ?? option.line.areaOpacity * 100) / 100,
            color: safeColorToEcharts(option.line.areaColor),
          }
        : undefined;
      item.label = { ...option.line.label };
    }
    if (item.type === 'bar' && option.bar) {
      item.barWidth = `${Number(style.barWidth ?? option.bar.width)}%`;
      item.barMaxWidth = option.bar.maxWidth;
      item.showBackground = option.bar.showBackground;
      item.backgroundStyle = { color: option.bar.backgroundColor };
      item.itemStyle = {
        color: safeColorToEcharts(option.bar.color),
        borderColor: option.bar.borderColor,
        borderWidth: option.bar.borderWidth,
        borderRadius: Number(style.barRadius ?? option.bar.radius),
      };
      item.label = { ...option.bar.label };
    }
  });

  if (spec.family === 'pie' && option.pie && series[0]) {
    const pie = option.pie;
    const inner = Number(style.innerRadius ?? pie.innerRadius);
    const outer = Number(style.outerRadius ?? pie.outerRadius);
    Object.assign(series[0], {
      center: [`${pie.centerX}%`, `${pie.centerY}%`],
      radius: inner > 0 ? [`${inner}%`, `${outer}%`] : `${outer}%`,
      startAngle: pie.startAngle,
      clockwise: pie.clockwise,
      padAngle: pie.padAngle,
      roseType: String(style.roseType ?? pie.roseType) === 'none' ? undefined : String(style.roseType ?? pie.roseType),
      itemStyle: { borderRadius: pie.borderRadius, borderColor: pie.borderColor, borderWidth: pie.borderWidth },
      label: { ...pie.label },
      labelLine: { show: pie.label.show && pie.label.position === 'outside' },
    });
  }
  if (spec.family === 'funnel' && option.funnel && series[0]) {
    const funnel = option.funnel;
    Object.assign(series[0], {
      sort: style.funnelSort ?? funnel.sort,
      funnelAlign: style.funnelAlign ?? funnel.align,
      gap: Number(style.funnelGap ?? funnel.gap),
      left: `${funnel.left}%`,
      top: `${funnel.top}%`,
      width: `${funnel.width}%`,
      height: `${funnel.height}%`,
      minSize: `${funnel.minSize}%`,
      maxSize: `${funnel.maxSize}%`,
      label: { ...funnel.label },
      labelLine: { show: funnel.label.show && funnel.label.position === 'outside' },
    });
  }
  if (spec.family === 'radar' && option.radar) {
    const radar = option.radar;
    if (isRecord(rendered.radar)) {
      Object.assign(rendered.radar, {
        center: [`${radar.centerX}%`, `${radar.centerY}%`],
        radius: `${radar.radius}%`,
        shape: style.radarShape ?? radar.shape,
        splitNumber: Number(style.splitNumber ?? radar.splitNumber),
        axisName: { show: true, color: radar.axisNameColor, fontSize: radar.axisNameSize },
        axisLine: { lineStyle: { color: radar.axisLineColor } },
        splitLine: { lineStyle: { color: radar.splitLineColor } },
        splitArea: { areaStyle: { color: radar.splitAreaColors } },
      });
    }
    series.forEach((item) => {
      if (item.type !== 'radar') return;
      item.symbol = style.showSymbol === false ? 'none' : radar.symbol;
      item.symbolSize = radar.symbolSize;
      item.lineStyle = { width: Number(style.lineWidth ?? radar.lineWidth) };
      item.areaStyle = { opacity: Number(style.areaOpacity ?? radar.areaOpacity * 100) / 100 };
      item.label = { ...radar.label };
    });
  }
  if (spec.family === 'gauge' && option.gauge && series[0]) {
    const gauge = option.gauge;
    const item = series[0];
    const axisLine = isRecord(item.axisLine) ? item.axisLine : {};
    const axisLineStyle = isRecord(axisLine.lineStyle) ? axisLine.lineStyle : {};
    Object.assign(item, {
      center: [`${gauge.centerX}%`, `${gauge.centerY}%`],
      radius: `${gauge.radius}%`,
      min: Number(style.gaugeMin ?? gauge.min),
      max: Number(style.gaugeMax ?? gauge.max),
      startAngle: Number(style.gaugeStartAngle ?? gauge.startAngle),
      endAngle: Number(style.gaugeEndAngle ?? gauge.endAngle),
      splitNumber: Number(style.splitNumber ?? gauge.splitNumber),
      pointer: {
        ...(isRecord(item.pointer) ? item.pointer : {}),
        show: Boolean(style.showPointer ?? gauge.showPointer),
        width: gauge.pointerWidth,
      },
      progress: {
        ...(isRecord(item.progress) ? item.progress : {}),
        show: Boolean(style.showProgress ?? gauge.showProgress),
        width: gauge.progressWidth,
      },
      axisLine: {
        ...axisLine,
        lineStyle: {
          ...axisLineStyle,
          width: gauge.axisLineWidth,
        },
      },
      title: { ...(isRecord(item.title) ? item.title : {}), color: gauge.titleColor, fontSize: gauge.titleSize },
      detail: { ...(isRecord(item.detail) ? item.detail : {}), color: gauge.detailColor, fontSize: gauge.detailSize },
    });
  }
  applyVisualOverrides(rendered, option.visual);
  enforceCanvasTooltips(rendered);
}

function applyVisualOverrides(
  rendered: Record<string, unknown>,
  visual: SafeChartVisualOverrides | undefined,
): void {
  if (!visual) return;
  if (visual.root) mergeVisual(rendered, visual.root);
  mergeRenderedTarget(rendered.grid, visual.grid);
  mergeRenderedTarget(rendered.legend, visual.legend);
  mergeRenderedTarget(rendered.xAxis, visual.axis);
  mergeRenderedTarget(rendered.yAxis, visual.axis);
  mergeRenderedTarget(rendered.xAxis, visual.xAxis);
  mergeRenderedTarget(rendered.yAxis, visual.yAxis);
  mergeRenderedTarget(rendered.radar, visual.coordinate);

  const series = Array.isArray(rendered.series) ? rendered.series.filter(isRecord) : [];
  series.forEach((item) => {
    const family = item.type;
    if (visual.series) mergeVisual(item, visual.series);
    if (family === 'line' && visual.lineSeries) mergeVisual(item, visual.lineSeries);
    if (family === 'bar' && visual.barSeries) mergeVisual(item, visual.barSeries);
    item.type = family;
  });
}

function enforceCanvasTooltips(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(enforceCanvasTooltips);
  } else if (isRecord(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'data') continue;
      if (key === 'tooltip' && isRecord(value)) {
        value.renderMode = 'richText';
        value.confine = true;
      }
      enforceCanvasTooltips(value);
    }
  }
}

function mergeRenderedTarget(target: unknown, source: SafeChartVisualObject | undefined): void {
  if (!source) return;
  if (Array.isArray(target)) {
    target.filter(isRecord).forEach((item) => mergeVisual(item, source));
  } else if (isRecord(target)) {
    mergeVisual(target, source);
  }
}

function mergeVisual(target: Record<string, unknown>, source: SafeChartVisualObject): void {
  for (const [key, value] of Object.entries(source)) {
    if (VISUAL_MERGE_BLOCKED_KEYS.has(key)) continue;
    const converted = convertVisualValue(value);
    if (isRecord(converted) && isRecord(target[key])) {
      mergeVisual(target[key] as Record<string, unknown>, converted as SafeChartVisualObject);
    } else {
      target[key] = converted;
    }
  }
}

function convertVisualValue(value: SafeChartVisualObject[string]): unknown {
  if (Array.isArray(value)) return value.map((item) => convertVisualValue(item));
  if (!isRecord(value)) return value;
  if (value.type === 'linear'
    && (value.direction === 'vertical' || value.direction === 'horizontal' || value.direction === 'diagonal')
    && Array.isArray(value.stops)) {
    return safeColorToEcharts(value as unknown as SafeChartColor);
  }
  return Object.fromEntries(Object.entries(value as SafeChartVisualObject).map(([key, item]) => [key, convertVisualValue(item)]));
}

function applyLegendPosition(legend: Record<string, unknown>, position: string): void {
  delete legend.top;
  delete legend.right;
  delete legend.bottom;
  delete legend.left;
  if (position === 'topRight') Object.assign(legend, { top: 8, right: 12 });
  else if (position === 'bottom') Object.assign(legend, { bottom: 0, left: 'center' });
  else if (position === 'left') Object.assign(legend, { left: 8, top: 'middle' });
  else if (position === 'right') Object.assign(legend, { right: 8, top: 'middle' });
  else Object.assign(legend, { top: 8, left: 'center' });
}

function safeColorToEcharts(color: SafeChartColor): unknown {
  if (typeof color === 'string') return color;
  const coordinates = {
    vertical: { x: 0, y: 0, x2: 0, y2: 1 },
    horizontal: { x: 0, y: 0, x2: 1, y2: 0 },
    diagonal: { x: 0, y: 0, x2: 1, y2: 1 },
  }[color.direction];
  return { type: 'linear', ...coordinates, colorStops: color.stops };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
