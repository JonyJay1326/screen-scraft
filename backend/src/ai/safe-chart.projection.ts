import type {
  ChartFamily,
  SafeChartColor,
  SafeChartOptionV2,
  SafeChartSpecV2,
  SafeChartVisualObject,
  SafeChartVisualOverrides,
  SafeChartVisualValue,
} from '@screencraft/shared';

export interface SafeChartProjectionResult {
  safeSpec?: SafeChartSpecV2;
  warnings: string[];
  rejectedReason?: string;
}

const FAMILIES = new Set<ChartFamily>(['line', 'bar', 'pie', 'combo', 'funnel', 'radar', 'gauge']);
const BLOCKED_KEYS = new Set([
  '__proto__', 'prototype', 'constructor', 'renderItem', 'dataset', 'data',
  'series', 'indicator', 'graphic', 'media', 'toolbox', 'visualMap', 'geo', 'calendar', 'script',
  'html', 'css', 'svg', 'path', 'url', 'href', 'src', 'image', 'link', 'sublink',
  'coordinateSystem', 'encode', 'dimensions', 'datasetIndex', 'datasetId',
]);
const BLOCKED_KEY_PART = /(?:renderitem|callback|function|script|html|css|svg|url|href|src)/i;
const UNSAFE_STRING = /(?:javascript\s*:|data\s*:|image\s*:\/\/|(?:https?|ftp|file|blob):\/\/|<\s*\/?\s*[a-z]|url\s*\(|expression\s*\(|=>|\bfunction\s*\()/i;
const VISUAL_TARGETS = new Set<keyof SafeChartVisualOverrides>([
  'root', 'grid', 'legend', 'axis', 'xAxis', 'yAxis', 'coordinate', 'series', 'lineSeries', 'barSeries',
]);
const VISUAL_STYLE_PROPERTY: Record<string, string> = {
  Width: 'width', Color: 'color', Type: 'type', Opacity: 'opacity',
};
const SAFE_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*[\d.]+(?:deg)?\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)|transparent)$/i;

const ENUM_VALUES: Record<string, readonly string[]> = {
  '$.option.legend.position': ['top', 'topRight', 'bottom', 'left', 'right'],
  '$.option.legend.orientation': ['horizontal', 'vertical'],
  '$.option.legend.icon': ['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'line'],
  '$.option.axis.gridType': ['solid', 'dashed', 'dotted'],
  '$.option.line.lineType': ['solid', 'dashed', 'dotted'],
  '$.option.line.symbol': ['none', 'circle', 'rect', 'triangle', 'diamond'],
  '$.option.line.label.position': ['top', 'inside', 'center', 'outside', 'right'],
  '$.option.line.label.fontWeight': ['normal', 'bold'],
  '$.option.bar.label.position': ['top', 'inside', 'center', 'outside', 'right'],
  '$.option.bar.label.fontWeight': ['normal', 'bold'],
  '$.option.pie.roseType': ['none', 'radius', 'area'],
  '$.option.pie.label.position': ['top', 'inside', 'center', 'outside', 'right'],
  '$.option.pie.label.fontWeight': ['normal', 'bold'],
  '$.option.funnel.sort': ['ascending', 'descending', 'none'],
  '$.option.funnel.align': ['left', 'center', 'right'],
  '$.option.funnel.label.position': ['top', 'inside', 'center', 'outside', 'right'],
  '$.option.funnel.label.fontWeight': ['normal', 'bold'],
  '$.option.radar.shape': ['polygon', 'circle'],
  '$.option.radar.symbol': ['none', 'circle', 'rect', 'triangle', 'diamond'],
  '$.option.radar.label.position': ['top', 'inside', 'center', 'outside', 'right'],
  '$.option.radar.label.fontWeight': ['normal', 'bold'],
};

const ENUM_ALIASES: Record<string, string> = {
  topcenter: 'top', 'top-center': 'top', '顶部': 'top', '顶部居中': 'top',
  topright: 'topRight', 'top-right': 'topRight', upperright: 'topRight', 'upper-right': 'topRight', '右上': 'topRight',
  bottomcenter: 'bottom', 'bottom-center': 'bottom', '底部': 'bottom',
  horizontal: 'horizontal', '水平': 'horizontal', vertical: 'vertical', '垂直': 'vertical',
  roundrectangle: 'roundRect', 'round-rect': 'roundRect', 圆角矩形: 'roundRect',
  solid: 'solid', 实线: 'solid', dash: 'dashed', dashed: 'dashed', 虚线: 'dashed', dot: 'dotted', dotted: 'dotted', 点线: 'dotted',
  ascending: 'ascending', asc: 'ascending', 升序: 'ascending', descending: 'descending', desc: 'descending', 降序: 'descending',
  none: 'none', 关闭: 'none', left: 'left', 左: 'left', right: 'right', 右: 'right', center: 'center', 居中: 'center',
  inside: 'inside', 内部: 'inside', outside: 'outside', 外部: 'outside', top: 'top', 顶部标签: 'top',
  normal: 'normal', bold: 'bold', 加粗: 'bold',
  polygon: 'polygon', 多边形: 'polygon', circle: 'circle', 圆形: 'circle', rect: 'rect', triangle: 'triangle', diamond: 'diamond', line: 'line',
  radius: 'radius', area: 'area',
};

const INTEGER_PATHS = new Set([
  '$.option.radar.splitNumber', '$.option.gauge.splitNumber',
]);

export function projectGeneratedChartSpec(input: unknown): SafeChartProjectionResult {
  const unsafe = findUnsafeValue(input);
  if (unsafe) {
    return { warnings: [], rejectedReason: unsafe };
  }
  if (!isRecord(input)) {
    return { warnings: [], rejectedReason: 'safeSpec 必须是普通对象' };
  }
  if (input.kind !== 'chart') {
    return { warnings: [], rejectedReason: 'safeSpec.kind 必须为 chart' };
  }
  if (typeof input.family !== 'string' || !FAMILIES.has(input.family as ChartFamily)) {
    return { warnings: [], rejectedReason: 'safeSpec.family 不是支持的图表族' };
  }
  if (input.schemaVersion !== 1 && input.schemaVersion !== 2) {
    return { warnings: [], rejectedReason: 'safeSpec.schemaVersion 仅支持 1 或 2' };
  }

  const warnings: string[] = [];
  if (input.schemaVersion === 1) {
    addWarning(warnings, '旧版图表描述已安全迁移为 SafeChartSpec v2');
  }
  for (const key of Object.keys(input)) {
    if (!['kind', 'schemaVersion', 'family', 'fidelity', 'option'].includes(key)) {
      addWarning(warnings, `已忽略未支持字段 $.${key}`);
    }
  }

  const family = input.family as ChartFamily;
  const defaults = buildDefaults(family);
  const rawOption = isRecord(input.option) ? input.option : {};
  if (!isRecord(input.option)) {
    addWarning(warnings, 'option 缺失或无效，已使用安全默认样式');
  }
  const prepared = prepareOption(rawOption, defaults, family, warnings);
  const option = projectRecord(
    prepared.canonical,
    defaults as unknown as Record<string, unknown>,
    '$.option',
    warnings,
  ) as unknown as SafeChartOptionV2;
  if (Object.keys(prepared.visual).length) option.visual = prepared.visual;
  normalizeCrossFields(option, family, warnings);
  return {
    safeSpec: {
      kind: 'chart',
      schemaVersion: 2,
      family,
      fidelity: warnings.length || input.fidelity === 'approximate' ? 'approximate' : 'exact',
      option,
    },
    warnings,
  };
}

function buildDefaults(family: ChartFamily): SafeChartOptionV2 {
  const label = () => ({
    show: false,
    position: 'top' as const,
    color: '#DCE8FF',
    fontSize: 12,
    fontWeight: 'normal' as const,
    distance: 8,
  });
  const base: SafeChartOptionV2 = {
    palette: ['#2F7FF7', '#35E0FF', '#7C5CFC', '#22C55E', '#F59E0B'],
    backgroundColor: 'transparent',
    legend: {
      show: true,
      position: 'top',
      orientation: 'horizontal',
      icon: 'roundRect',
      itemWidth: 18,
      itemHeight: 8,
      gap: 16,
      textColor: '#B8CAE6',
      textSize: 12,
    },
  };
  if (family === 'line' || family === 'bar' || family === 'combo') {
    base.grid = { left: 40, right: 24, top: 44, bottom: 32, containLabel: true };
    base.axis = {
      showX: true,
      showY: true,
      labelColor: '#9FB3D1',
      labelSize: 12,
      labelRotate: 0,
      showTicks: false,
      axisLineColor: '#345079',
      axisLineWidth: 1,
      gridColor: '#23395D',
      gridWidth: 1,
      gridType: 'solid',
    };
  }
  if (family === 'line' || family === 'combo') {
    base.line = {
      smooth: true,
      width: 3,
      lineType: 'solid',
      areaOpacity: 0.18,
      areaColor: {
        type: 'linear',
        direction: 'vertical',
        stops: [{ offset: 0, color: 'rgba(47,127,247,0.45)' }, { offset: 1, color: 'rgba(47,127,247,0)' }],
      },
      symbol: 'circle',
      symbolSize: 6,
      label: label(),
    };
  }
  if (family === 'bar' || family === 'combo') {
    base.bar = {
      width: 36,
      maxWidth: 64,
      radius: 4,
      stack: false,
      horizontal: false,
      color: {
        type: 'linear',
        direction: 'vertical',
        stops: [{ offset: 0, color: '#35E0FF' }, { offset: 1, color: '#2F7FF7' }],
      },
      borderColor: 'transparent',
      borderWidth: 0,
      showBackground: false,
      backgroundColor: 'rgba(47,127,247,0.08)',
      label: label(),
    };
  }
  if (family === 'pie') {
    base.pie = {
      innerRadius: 48,
      outerRadius: 72,
      centerX: 50,
      centerY: 52,
      startAngle: 90,
      clockwise: true,
      padAngle: 1,
      borderRadius: 4,
      borderColor: 'transparent',
      borderWidth: 0,
      roseType: 'none',
      label: { ...label(), position: 'outside' },
    };
  }
  if (family === 'funnel') {
    base.funnel = {
      sort: 'descending',
      align: 'center',
      gap: 3,
      left: 10,
      top: 10,
      width: 80,
      height: 80,
      minSize: 0,
      maxSize: 100,
      label: { ...label(), show: true, position: 'inside' },
    };
  }
  if (family === 'radar') {
    base.radar = {
      shape: 'polygon',
      splitNumber: 5,
      centerX: 50,
      centerY: 54,
      radius: 68,
      areaOpacity: 0.24,
      axisNameColor: '#B8CAE6',
      axisNameSize: 12,
      axisLineColor: '#345079',
      splitLineColor: '#345079',
      splitAreaColors: ['rgba(47,127,247,0.03)', 'rgba(47,127,247,0.08)'],
      symbol: 'circle',
      symbolSize: 5,
      lineWidth: 2,
      label: label(),
    };
  }
  if (family === 'gauge') {
    base.gauge = {
      min: 0,
      max: 100,
      startAngle: 225,
      endAngle: -45,
      centerX: 50,
      centerY: 56,
      radius: 78,
      showPointer: true,
      pointerWidth: 6,
      showProgress: true,
      progressWidth: 14,
      axisLineWidth: 14,
      splitNumber: 10,
      titleColor: '#B8CAE6',
      titleSize: 14,
      detailColor: '#F5FAFF',
      detailSize: 30,
    };
  }
  return base;
}

function prepareOption(
  raw: Record<string, unknown>,
  defaults: SafeChartOptionV2,
  family: ChartFamily,
  warnings: string[],
): { canonical: Record<string, unknown>; visual: SafeChartVisualOverrides } {
  const canonical: Record<string, unknown> = {};
  const visual: SafeChartVisualOverrides = {};
  const defaultRecord = defaults as unknown as Record<string, unknown>;

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'visual') {
      continue;
    }
    if (!(key in defaultRecord)) {
      if ((key === 'grid' || key === 'axis') && !['line', 'bar', 'combo'].includes(family)) continue;
      mergeVisualTarget(visual, 'root', { [key]: value }, warnings);
      continue;
    }
    const fallback = defaultRecord[key];
    if (!isRecord(fallback) || !isRecord(value)) {
      canonical[key] = value;
      continue;
    }
    const split = splitKnownFields(value, fallback);
    canonical[key] = split.known;
    if (!Object.keys(split.visual).length) continue;
    if (key === 'grid' || key === 'legend' || key === 'axis') {
      mergeVisualTarget(visual, key, split.visual, warnings);
    } else {
      mergeFamilyVisual(visual, family, key, split.visual, warnings);
    }
  }
  // 显式扩展优先于扁平字段投影，不依赖模型 JSON 字段顺序。
  if (raw.visual !== undefined) mergeExplicitVisual(raw.visual, visual, warnings);
  const rootVisual = visual.root;
  if (rootVisual && isRecord(rootVisual.tooltip)) {
    rootVisual.tooltip = { ...rootVisual.tooltip, renderMode: 'richText' } as SafeChartVisualObject;
  }
  return { canonical, visual };
}

function splitKnownFields(
  raw: Record<string, unknown>,
  defaults: Record<string, unknown>,
): { known: Record<string, unknown>; visual: Record<string, unknown> } {
  const known: Record<string, unknown> = {};
  const visual: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.startsWith('path://')) {
      visual[key] = value;
      continue;
    }
    if (!(key in defaults)) {
      visual[key] = value;
      continue;
    }
    const fallback = defaults[key];
    if (isRecord(value) && isRecord(fallback)) {
      const nested = splitKnownFields(value, fallback);
      known[key] = nested.known;
      if (Object.keys(nested.visual).length) visual[key] = nested.visual;
    } else {
      known[key] = value;
    }
  }
  return { known, visual };
}

function mergeExplicitVisual(raw: unknown, visual: SafeChartVisualOverrides, warnings: string[]): void {
  if (!isRecord(raw)) {
    addWarning(warnings, '$.option.visual 类型无效，已忽略');
    return;
  }
  for (const [key, value] of Object.entries(raw)) {
    if (!VISUAL_TARGETS.has(key as keyof SafeChartVisualOverrides) || !isRecord(value)) {
      addWarning(warnings, '$.option.visual 包含无效目标，已忽略');
      continue;
    }
    mergeVisualTarget(visual, key as keyof SafeChartVisualOverrides, value, warnings);
  }
}

function mergeFamilyVisual(
  visual: SafeChartVisualOverrides,
  family: ChartFamily,
  block: string,
  extra: Record<string, unknown>,
  warnings: string[],
): void {
  if (family === 'radar') {
    const { coordinate, series } = normalizeRadarVisual(extra);
    if (Object.keys(coordinate).length) mergeVisualTarget(visual, 'coordinate', coordinate, warnings);
    if (Object.keys(series).length) mergeVisualTarget(visual, 'series', series, warnings);
    return;
  }
  const normalized = normalizeSeriesVisual(extra);
  const target = family === 'combo' && block === 'line'
    ? 'lineSeries'
    : family === 'combo' && block === 'bar'
      ? 'barSeries'
      : 'series';
  mergeVisualTarget(visual, target, normalized, warnings);
}

function normalizeRadarVisual(extra: Record<string, unknown>): {
  coordinate: Record<string, unknown>;
  series: Record<string, unknown>;
} {
  const coordinate: Record<string, unknown> = {};
  const seriesInput: Record<string, unknown> = {};
  const coordinateKeys = new Set([
    'center', 'radius', 'startAngle', 'shape', 'splitNumber', 'nameGap', 'scale', 'silent', 'triggerEvent',
    'axisName', 'name', 'axisLine', 'axisLabel', 'splitLine', 'splitArea',
  ]);
  for (const [key, value] of Object.entries(extra)) {
    const lineMatch = key.match(/^(axisLine|splitLine)(Width|Color|Type)$/);
    if (lineMatch) {
      const property = VISUAL_STYLE_PROPERTY[lineMatch[2]];
      if (!property) continue;
      setNestedVisual(coordinate, [lineMatch[1], 'lineStyle', property], value);
      continue;
    }
    if (key === 'splitAreaColor' || key === 'splitAreaColors') {
      setNestedVisual(coordinate, ['splitArea', 'areaStyle', 'color'], typeof value === 'string' ? [value] : value);
      continue;
    }
    if (key === 'splitAreaOpacity') {
      setNestedVisual(coordinate, ['splitArea', 'areaStyle', 'opacity'], value);
      continue;
    }
    if (coordinateKeys.has(key)) coordinate[key] = value;
    else seriesInput[key] = value;
  }
  return { coordinate, series: normalizeSeriesVisual(seriesInput) };
}

function normalizeSeriesVisual(extra: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    const styleMatch = key.match(/^(line|area|item)(Width|Color|Type|Opacity)$/);
    if (styleMatch) {
      const block = `${styleMatch[1]}Style`;
      const property = VISUAL_STYLE_PROPERTY[styleMatch[2]];
      if (!property) continue;
      setNestedVisual(result, [block, property], value);
      continue;
    }
    if (/^shadow(?:Blur|Color|OffsetX|OffsetY)$/.test(key)) {
      setNestedVisual(result, ['itemStyle', key], value);
      continue;
    }
    result[key] = value;
  }
  return result;
}

function setNestedVisual(target: Record<string, unknown>, path: string[], value: unknown): void {
  let cursor = target;
  path.forEach((key, index) => {
    if (index === path.length - 1) {
      cursor[key] = value;
      return;
    }
    if (!isRecord(cursor[key])) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  });
}

function mergeVisualTarget(
  visual: SafeChartVisualOverrides,
  target: keyof SafeChartVisualOverrides,
  raw: Record<string, unknown>,
  warnings: string[],
): void {
  const sanitized = sanitizeVisualObject(raw, `$.option.visual.${target}`, warnings, 0);
  if (!Object.keys(sanitized).length) return;
  visual[target] = mergeVisualObjects(visual[target] ?? {}, sanitized);
}

function sanitizeVisualObject(
  raw: Record<string, unknown>,
  path: string,
  warnings: string[],
  depth: number,
): SafeChartVisualObject {
  const result: SafeChartVisualObject = {};
  const entries = Object.entries(raw);
  if (entries.length > 64) addWarning(warnings, `${path} 超出 64 个字段，已截断`);
  for (const [key, value] of entries.slice(0, 64)) {
    const sanitized = sanitizeVisualValue(value, `${path}.${key}`, key, warnings, depth + 1);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

function sanitizeVisualValue(
  value: unknown,
  path: string,
  key: string,
  warnings: string[],
  depth: number,
): SafeChartVisualValue | undefined {
  if (depth > 8) {
    addWarning(warnings, `${path} 层级过深，已忽略`);
    return undefined;
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      addWarning(warnings, `${path} 不是有限数字，已忽略`);
      return undefined;
    }
    const clamped = clampVisualNumber(key, value);
    if (clamped !== value) addWarning(warnings, `${path} 已限制为 ${clamped}`);
    return clamped;
  }
  if (Array.isArray(value)) {
    if (value.length > 64) addWarning(warnings, `${path} 超出 64 项，已截断`);
    return value.slice(0, 64).flatMap((item, index) => {
      const sanitized = sanitizeVisualValue(item, `${path}[${index}]`, key, warnings, depth + 1);
      return sanitized === undefined ? [] : [sanitized];
    });
  }
  if (isRecord(value)) return sanitizeVisualObject(value, path, warnings, depth);
  addWarning(warnings, `${path} 不是安全 JSON 值，已忽略`);
  return undefined;
}

function clampVisualNumber(key: string, value: number): number {
  if (/^(?:animationDuration|animationDelay|animationDurationUpdate|animationDelayUpdate)$/.test(key)) {
    return Math.min(5000, Math.max(0, value));
  }
  if (key === 'animationThreshold') return Math.round(Math.min(2000, Math.max(0, value)));
  if (key === 'zlevel') return Math.round(Math.min(4, Math.max(0, value)));
  if (/^(?:shadowBlur|symbolSize)$/.test(key)) return Math.min(256, Math.max(0, value));
  return Math.min(1_000_000, Math.max(-1_000_000, value));
}

function mergeVisualObjects(left: SafeChartVisualObject, right: SafeChartVisualObject): SafeChartVisualObject {
  const result: SafeChartVisualObject = { ...left };
  for (const [key, value] of Object.entries(right)) {
    const current = result[key];
    result[key] = isRecord(current) && isRecord(value)
      ? mergeVisualObjects(current as SafeChartVisualObject, value as SafeChartVisualObject)
      : cloneValue(value);
  }
  return result;
}

function projectRecord(
  raw: Record<string, unknown>,
  defaults: Record<string, unknown>,
  path: string,
  warnings: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const itemPath = `${path}.${key}`;
    if (!(key in raw)) {
      result[key] = cloneValue(fallback);
      continue;
    }
    result[key] = projectValue(raw[key], fallback, itemPath, warnings);
  }
  return result;
}

function projectValue(raw: unknown, fallback: unknown, path: string, warnings: string[]): unknown {
  if (path.endsWith('.areaColor') || path === '$.option.bar.color') {
    return projectChartColor(raw, fallback as SafeChartColor, path, warnings);
  }
  if (Array.isArray(fallback)) {
    return projectColorArray(raw, fallback as string[], path, warnings);
  }
  if (isRecord(fallback)) {
    if (!isRecord(raw)) {
      addWarning(warnings, `${path} 类型无效，已使用安全默认值`);
      return cloneValue(fallback);
    }
    return projectRecord(raw, fallback, path, warnings);
  }
  if (typeof fallback === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    if (raw === 'true' || raw === 'false') {
      return raw === 'true';
    }
    addWarning(warnings, `${path} 类型无效，已使用安全默认值`);
    return fallback;
  }
  if (typeof fallback === 'number') {
    const normalized = normalizeNumber(raw, path);
    if (normalized === undefined) {
      addWarning(warnings, `${path} 数值无效，已使用安全默认值`);
      return fallback;
    }
    const [min, max] = rangeFor(path);
    let value = Math.min(max, Math.max(min, normalized));
    if (INTEGER_PATHS.has(path)) value = Math.round(value);
    if (value !== normalized) {
      addWarning(warnings, `${path} 已归一化为 ${value}`);
    }
    return value;
  }
  if (typeof fallback === 'string') {
    if (isColorPath(path)) {
      if (typeof raw === 'string' && SAFE_COLOR.test(raw.trim())) return raw.trim();
      addWarning(warnings, `${path} 颜色无效，已使用安全默认值`);
      return fallback;
    }
    const allowed = ENUM_VALUES[path];
    if (allowed) {
      if (typeof raw === 'string' && allowed.includes(raw)) return raw;
      const alias = typeof raw === 'string' ? ENUM_ALIASES[raw.trim().toLowerCase()] : undefined;
      if (alias && allowed.includes(alias)) {
        return alias;
      }
      addWarning(warnings, `${path} 枚举无效，已使用安全默认值`);
      return fallback;
    }
    return typeof raw === 'string' ? raw : fallback;
  }
  return cloneValue(fallback);
}

function projectChartColor(raw: unknown, fallback: SafeChartColor, path: string, warnings: string[]): SafeChartColor {
  if (typeof raw === 'string' && SAFE_COLOR.test(raw.trim())) return raw.trim();
  if (!isRecord(raw) || raw.type !== 'linear') {
    addWarning(warnings, `${path} 渐变无效，已使用安全默认值`);
    return cloneValue(fallback) as SafeChartColor;
  }
  const direction = projectGradientDirection(raw.direction, `${path}.direction`, warnings);
  const sourceStops = Array.isArray(raw.stops) ? raw.stops : [];
  if (sourceStops.length > 8) addWarning(warnings, `${path}.stops 超出 8 项，已截断`);
  const rawStops = sourceStops.slice(0, 8);
  const stops = rawStops.flatMap((stop, index) => {
    if (!isRecord(stop) || typeof stop.color !== 'string' || !SAFE_COLOR.test(stop.color.trim())) {
      addWarning(warnings, `${path}.stops[${index}] 无效，已忽略`);
      return [];
    }
    const offset = normalizeNumber(stop.offset, `${path}.stops[${index}].offset`);
    if (offset === undefined) {
      addWarning(warnings, `${path}.stops[${index}].offset 无效，已忽略`);
      return [];
    }
    const normalizedOffset = Math.min(1, Math.max(0, offset));
    if (normalizedOffset !== offset || stop.offset !== offset) {
      addWarning(warnings, `${path}.stops[${index}].offset 已归一化为 ${normalizedOffset}`);
    }
    for (const key of Object.keys(stop)) {
      if (!['offset', 'color'].includes(key)) addWarning(warnings, `已忽略未支持字段 ${path}.stops[${index}].${key}`);
    }
    return [{ offset: normalizedOffset, color: stop.color.trim() }];
  });
  if (stops.length < 2) {
    addWarning(warnings, `${path}.stops 少于 2 个有效色标，已使用安全默认值`);
    return cloneValue(fallback) as SafeChartColor;
  }
  for (const key of Object.keys(raw)) {
    if (!['type', 'direction', 'stops'].includes(key)) addWarning(warnings, `已忽略未支持字段 ${path}.${key}`);
  }
  const sortedStops = [...stops].sort((left, right) => left.offset - right.offset);
  return { type: 'linear', direction, stops: sortedStops };
}

function projectColorArray(raw: unknown, fallback: string[], path: string, warnings: string[]): string[] {
  if (!Array.isArray(raw)) {
    addWarning(warnings, `${path} 类型无效，已使用安全默认值`);
    return [...fallback];
  }
  const max = path === '$.option.radar.splitAreaColors' ? 12 : 16;
  const colors = raw.slice(0, max).filter((item): item is string => typeof item === 'string' && SAFE_COLOR.test(item.trim()));
  if (!colors.length) {
    addWarning(warnings, `${path} 没有有效颜色，已使用安全默认值`);
    return [...fallback];
  }
  if (colors.length !== raw.length) addWarning(warnings, `${path} 中的无效或超量颜色已忽略`);
  return colors.map((color) => color.trim());
}

function normalizeNumber(raw: unknown, path: string): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return undefined;
  const text = raw.trim();
  const percent = text.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent && isPercentPath(path)) return Number(percent[1]);
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  return undefined;
}

function projectGradientDirection(
  raw: unknown,
  path: string,
  warnings: string[],
): 'vertical' | 'horizontal' | 'diagonal' {
  if (raw === 'vertical' || raw === 'horizontal' || raw === 'diagonal') return raw;
  const alias = typeof raw === 'string' ? ENUM_ALIASES[raw.trim().toLowerCase()] : undefined;
  if (alias === 'vertical' || alias === 'horizontal') {
    return alias;
  }
  addWarning(warnings, `${path} 枚举无效，已使用安全默认值`);
  return 'vertical';
}

function rangeFor(path: string): [number, number] {
  if (/Opacity$/.test(path)) return [0, 1];
  if (/^\$\.option\.grid\.(?:left|right|top|bottom)$/.test(path)) return [0, 2048];
  if (path === '$.option.line.width' || path === '$.option.radar.lineWidth') return [1, 20];
  if (path === '$.option.axis.axisLineWidth' || path === '$.option.axis.gridWidth') return [0, 12];
  if (path === '$.option.gauge.axisLineWidth' || path === '$.option.gauge.progressWidth') return [1, 64];
  if (path === '$.option.pie.borderRadius' || path === '$.option.bar.radius') return [0, 100];
  if (path === '$.option.pie.outerRadius' || path === '$.option.radar.radius' || path === '$.option.gauge.radius') return [1, 100];
  if (path === '$.option.funnel.width' || path === '$.option.funnel.height' || path === '$.option.funnel.maxSize') return [1, 100];
  if (/\.(?:centerX|centerY|innerRadius|outerRadius|radius|left|top|width|height|minSize|maxSize)$/.test(path)) {
    if (path === '$.option.bar.width') return [1, 100];
    return [0, 100];
  }
  if (/\.textSize$|\.labelSize$|\.axisNameSize$/.test(path)) return [8, 48];
  if (/\.fontSize$|\.titleSize$/.test(path)) return [8, 64];
  if (/\.detailSize$/.test(path)) return [8, 120];
  if (/\.symbolSize$/.test(path)) return [0, 64];
  if (/\.splitNumber$/.test(path)) return path.includes('.gauge.') ? [2, 20] : [2, 12];
  if (path.endsWith('.labelRotate')) return [-90, 90];
  if (/Angle$/.test(path)) return [-360, 360];
  if (path === '$.option.funnel.gap') return [0, 64];
  if (/\.gap$|\.distance$/.test(path)) return [0, 80];
  if (/\.itemWidth$|\.itemHeight$/.test(path)) return [4, 80];
  if (/\.pointerWidth$/.test(path)) return [1, 40];
  if (/\.gridWidth$|\.borderWidth$/.test(path)) return [0, 12];
  if (path.endsWith('.maxWidth')) return [1, 200];
  if (path.endsWith('.padAngle')) return [0, 30];
  if (path.endsWith('.min') || path.endsWith('.max')) return [-1_000_000, 1_000_000];
  return [-1_000_000, 1_000_000];
}

function normalizeCrossFields(option: SafeChartOptionV2, family: ChartFamily, warnings: string[]): void {
  if (family === 'pie' && option.pie && option.pie.innerRadius >= option.pie.outerRadius) {
    option.pie.innerRadius = 48;
    option.pie.outerRadius = 72;
    addWarning(warnings, '$.option.pie 内外半径无效，已使用安全默认值');
  }
  if (family === 'funnel' && option.funnel && option.funnel.minSize > option.funnel.maxSize) {
    option.funnel.minSize = 0;
    option.funnel.maxSize = 100;
    addWarning(warnings, '$.option.funnel 尺寸范围无效，已使用安全默认值');
  }
  if (family === 'gauge' && option.gauge && option.gauge.min >= option.gauge.max) {
    option.gauge.min = 0;
    option.gauge.max = 100;
    addWarning(warnings, '$.option.gauge 数值范围无效，已使用安全默认值');
  }
}

function isPercentPath(path: string): boolean {
  return /\.(?:centerX|centerY|innerRadius|outerRadius|radius|left|top|width|height|minSize|maxSize)$/.test(path);
}

function isColorPath(path: string): boolean {
  return /(?:Color|\.color)$/.test(path) && !path.endsWith('.areaColor');
}

function findUnsafeValue(input: unknown, path = '$', depth = 0): string | undefined {
  if (depth > 10) return `${path} 对象层级过深`;
  if (typeof input === 'function') return `${path} 包含函数`;
  if (typeof input === 'string' && input.startsWith('path://') && !isSafePathSymbol(input)) {
    return `${path} 的 path:// 路径超出安全复杂度或包含非法命令`;
  }
  if (typeof input === 'string' && UNSAFE_STRING.test(input)) return `${path} 包含代码、标签或外部资源`;
  if (Array.isArray(input)) {
    for (let index = 0; index < input.length; index += 1) {
      const issue = findUnsafeValue(input[index], `${path}[${index}]`, depth + 1);
      if (issue) return issue;
    }
  } else if (isRecord(input)) {
    for (const [key, value] of Object.entries(input)) {
      if (path === '$.option.visual' && VISUAL_TARGETS.has(key as keyof SafeChartVisualOverrides)) {
        const issue = findUnsafeValue(value, `${path}.${key}`, depth + 1);
        if (issue) return issue;
        continue;
      }
      if (key === 'formatter') {
        if (typeof value !== 'string' || !isSafeFormatterTemplate(value)) return `${path}.${key} 仅允许纯文本固定占位符模板`;
        continue;
      }
      if (key === 'type' && /^\$\.option\.(?:(?:line|bar|pie|funnel|radar|gauge)|visual\.(?:series|lineSeries|barSeries))$/.test(path)) {
        return `${path}.${key} 不能改变图表类型`;
      }
      if (BLOCKED_KEYS.has(key) || BLOCKED_KEY_PART.test(key) || /^on[A-Z_]/i.test(key)) {
        return `${path}.${key} 是禁止字段`;
      }
      if (key === 'renderMode' && value !== 'richText') return `${path}.${key} 只允许 richText`;
      const issue = findUnsafeValue(value, `${path}.${key}`, depth + 1);
      if (issue) return issue;
    }
  }
  return undefined;
}

function isSafeFormatterTemplate(value: string): boolean {
  if (!value || value.length > 128 || UNSAFE_STRING.test(value)) return false;
  const plain = value.replace(/\{(?:a|b|c|d|value|name|seriesName)\d*\}/g, '');
  return !/[{}<>`\\]/.test(plain);
}

function isSafePathSymbol(value: string): boolean {
  const source = value.slice('path://'.length).trim();
  if (!source || source.length > 4096 || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/.test(source)) return false;
  const tokenPattern = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
  const tokens = source.match(tokenPattern) ?? [];
  if (source.replace(tokenPattern, '').replace(/[\s,]/g, '') || !/^[Mm]$/.test(tokens[0] ?? '')) return false;
  const arity: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  let index = 0;
  let segments = 0;
  while (index < tokens.length) {
    const command = tokens[index++].toLowerCase();
    const count = arity[command];
    if (count === undefined) return false;
    if (count === 0) {
      if (++segments > 256) return false;
      continue;
    }
    let groups = 0;
    while (index < tokens.length && !/^[a-z]$/i.test(tokens[index])) {
      if (index + count > tokens.length || ++segments > 256) return false;
      const values = tokens.slice(index, index + count).map(Number);
      if (values.some((number) => !Number.isFinite(number) || Math.abs(number) > 100_000)) return false;
      if (command === 'a' && (values[0] < 0 || values[1] < 0 || ![0, 1].includes(values[3]) || ![0, 1].includes(values[4]))) return false;
      index += count;
      groups += 1;
    }
    if (!groups) return false;
  }
  return segments > 0;
}

function addWarning(warnings: string[], message: string): void {
  if (warnings.length < 48 && !warnings.includes(message)) warnings.push(message);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
