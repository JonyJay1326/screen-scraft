import {
  createAiScreenCanvasTransform,
  isProtocolValid,
  projectAiScreenBounds,
  type AiScreenCanvasAppearance,
  type AiScreenComponentAppearance,
  type AiScreenCanvasTransform,
  type AiScreenComponentType,
  type AiScreenStructureDraft,
  type ComponentDoc,
  type PageDoc,
  type ProtocolKind,
} from '@screencraft/shared';
import { getTemplate } from '../../registry';
import { cloneJson } from '../../utils/clone';

const TEMPLATE_BY_TYPE: Partial<Record<AiScreenComponentType, string>> = {
  text: 'control-text',
  kpi: 'kpi-card-1',
  kpiList: 'kpi-card-list',
  line: 'chart-line-1',
  bar: 'chart-bar-1',
  pie: 'chart-pie-1',
  gauge: 'chart-gauge-1',
  table: 'table-list',
  border: 'border-1',
};

const FALLBACK_SCREEN_APPEARANCE: AiScreenCanvasAppearance = {
  panelBackgroundColor: '#191919',
  panelBorderColor: '#2A2D32',
  titleColor: '#E3E7EF',
  textColor: '#969EAA',
  valueColor: '#DCE2EA',
  accentColors: ['#3F7FF0', '#36D3A5', '#42C7C7', '#C94848'],
  panelRadius: 4,
};
const FALLBACK_SCREEN_BACKGROUND = '#141414';

export interface AiScreenPageMapping {
  draftId: string;
  componentName: string;
  componentType: AiScreenComponentType;
  templateId: string;
  templateLabel: string;
  styleSource: 'recognized' | 'inferred' | 'default';
  dataSource: 'recognized' | 'inferred' | 'default' | 'none';
}

export interface AiScreenPageSkippedItem {
  draftId: string;
  componentName: string;
  componentType: AiScreenComponentType;
  reason: string;
}

export interface AiScreenPageSkeleton {
  page: Omit<PageDoc, 'id'>;
  mappings: AiScreenPageMapping[];
  skipped: AiScreenPageSkippedItem[];
  warnings: string[];
  transform: AiScreenCanvasTransform;
}

/** 将已校对的结构草稿转换为无副作用的页面骨架预览。 */
export function buildAiScreenPageSkeleton(
  draft: AiScreenStructureDraft,
  targetCanvas: { width: number; height: number },
  pageName: string,
): AiScreenPageSkeleton {
  const transform = createAiScreenCanvasTransform(draft.canvas, targetCanvas);
  const theme = inferTheme(draft.canvas.backgroundColor);
  const mappings: AiScreenPageMapping[] = [];
  const skipped: AiScreenPageSkippedItem[] = [];
  const warnings: string[] = [];
  const components: ComponentDoc[] = [];
  const canvasAppearance = draft.canvas.appearance ?? FALLBACK_SCREEN_APPEARANCE;
  if (!draft.canvas.appearance) {
    warnings.push('模型未返回页面视觉主题，已采用工业暗色主题降级；重新识别可获得更精确的颜色和圆角');
  }
  const includedComponents = draft.components.filter((component) => component.included);
  const rowIconColors = inferKpiRowIconColors(includedComponents, canvasAppearance.accentColors);

  includedComponents.forEach((component) => {
    const templateId = TEMPLATE_BY_TYPE[component.type];
    if (!templateId) {
      skipped.push({
        draftId: component.id,
        componentName: component.name,
        componentType: component.type,
        reason: component.type === 'unsupported' ? '待人工选择模板，未自动生成' : '没有对应的内置模板',
      });
      return;
    }
    const template = getTemplate(templateId);
    if (!template) {
      skipped.push({
        draftId: component.id,
        componentName: component.name,
        componentType: component.type,
        reason: `内置模板 ${templateId} 不存在`,
      });
      return;
    }
    const bounds = projectAiScreenBounds(component.bounds, transform, targetCanvas);
    const style = cloneJson(template.defaultStyle[theme]);
    applyRecognizedText(style, component.type, component.title, component.visibleTexts);
    applyRecognizedAppearance(style, component.type, canvasAppearance, component.appearance);
    applyGeneratedVisualDefaults(style, component, rowIconColors.get(component.id));
    if (component.type === 'text') {
      applyInferredTextLayout(style, component, bounds, targetCanvas);
    }
    const recognizedData = normalizeRecognizedData(template.dataProtocol, component.mockData, component.visibleTexts);
    const hasRecognizedData = recognizedData !== undefined
      && Boolean(template.dataProtocol)
      && isProtocolValid(template.dataProtocol, recognizedData);
    if (component.mockData !== undefined && !hasRecognizedData) {
      warnings.push(`${component.name}的识别数据不符合 ${template.dataProtocol ?? '无'} 协议，已使用模板演示数据`);
    }
    const inferredData = hasRecognizedData || !template.dataProtocol
      ? undefined
      : inferStaticData(template.dataProtocol, component.title || component.name, component.visibleTexts);
    const hasInferredData = inferredData !== undefined && isProtocolValid(template.dataProtocol, inferredData);
    const staticData = hasRecognizedData
      ? recognizedData
      : hasInferredData
        ? inferredData
        : template.defaultData;
    components.push({
      id: `preview-${component.id}`,
      templateId,
      name: component.name,
      ...bounds,
      zIndex: components.length + 1,
      locked: false,
      hidden: false,
      groupId: null,
      theme,
      style,
      ...(staticData === undefined
        ? {}
        : { data: { source: 'static' as const, staticData: cloneJson(staticData) } }),
      events: [],
    });
    mappings.push({
      draftId: component.id,
      componentName: component.name,
      componentType: component.type,
      templateId,
      templateLabel: template.label,
      styleSource: draft.canvas.appearance || component.appearance ? 'recognized' : 'inferred',
      dataSource: staticData === undefined ? 'none' : hasRecognizedData ? 'recognized' : hasInferredData ? 'inferred' : 'default',
    });
  });

  if (draft.canvas.backgroundLayer) {
    warnings.push(`背景层“${draft.canvas.backgroundLayer.description}”不会生成，仅应用纯色背景`);
  }
  if (transform.scale !== 1 || transform.offsetX !== 0 || transform.offsetY !== 0) {
    warnings.push(`参考图按 ${(transform.scale * 100).toFixed(1)}% 等比缩放并居中到当前画布`);
  }

  return {
    page: {
      name: pageName,
      parentId: null,
      background: {
        type: 'normal',
        color: draft.canvas.appearance
          ? normalizeBackgroundColor(draft.canvas.backgroundColor)
          : FALLBACK_SCREEN_BACKGROUND,
        opacity: 100,
        fill: 'cover',
      },
      components,
    },
    mappings,
    skipped,
    warnings,
    transform,
  };
}

function normalizeRecognizedData(
  protocol: ProtocolKind | undefined,
  input: unknown,
  visibleTexts: string[],
): unknown {
  if (input === undefined || !Array.isArray(input)) {
    return input;
  }
  if (protocol === 'nameValue') {
    const alertNames = ['新增告警', '已解决', '未解决'];
    const hasAlertBreakdown = alertNames.slice(1).every((name) => visibleTexts.includes(name));
    if (hasAlertBreakdown) {
      return alertNames.flatMap((name) => {
        const labelIndex = visibleTexts.indexOf(name);
        const valueText = labelIndex >= 0 ? visibleTexts[labelIndex + 1] : undefined;
        return valueText && isMetricText(valueText)
          ? [{ name, value: parseMetric(valueText).number }]
          : [];
      });
    }
    return input;
  }
  if (protocol !== 'kpi-1') return input;
  return input.map((item) => {
    if (!isRecord(item) || typeof item.name !== 'string' || item.value === undefined) {
      return item;
    }
    return {
      ...item,
      unit: typeof item.unit === 'string' ? item.unit : '',
      trend: typeof item.trend === 'number' && Number.isFinite(item.trend) ? item.trend : 0,
      trendDir: item.trendDir === 'down' ? 'down' : 'up',
    };
  });
}

function inferStaticData(
  protocol: ProtocolKind,
  title: string,
  visibleTexts: string[],
): unknown {
  const texts = visibleTexts.filter((text) => text.trim() && text !== title && text !== '更多');
  if (protocol === 'kpi-1') {
    const valueIndex = texts.findIndex((text) => isMetricText(text));
    if (valueIndex < 0) return undefined;
    const metric = parseMetric(texts[valueIndex]!);
    const label = texts[valueIndex + 1] && !isMetricText(texts[valueIndex + 1]!)
      ? texts[valueIndex + 1]!
      : title;
    return [{ name: label, value: metric.value, unit: metric.unit, trend: 0, trendDir: 'up' }];
  }
  if (protocol === 'kpi-list') {
    const rows = metricRows(texts, title).map(({ label, metric }) => ({ name: label, value: metric.raw }));
    return rows.length ? rows : undefined;
  }
  if (protocol === 'nameValue') {
    const rows = metricRows(texts, title).map(({ label, metric }) => ({ name: label, value: metric.number }));
    return rows.length ? rows : undefined;
  }
  if (protocol === 'table') {
    return inferTableData(texts);
  }
  return undefined;
}

function metricRows(texts: string[], title: string): Array<{ label: string; metric: ParsedMetric }> {
  const rows: Array<{ label: string; metric: ParsedMetric }> = [];
  texts.forEach((text, index) => {
    if (isMetricText(text) || text === title || isControlText(text)) return;
    let cursor = index + 1;
    while (cursor < texts.length && isControlText(texts[cursor]!)) cursor += 1;
    const value = texts[cursor];
    if (value && isMetricText(value)) {
      rows.push({ label: text, metric: parseMetric(value) });
    }
  });
  texts.forEach((text, index) => {
    if (!isMetricText(text)) return;
    const metric = parseMetric(text);
    const label = findMetricLabel(texts, index, title);
    if (label && !rows.some((row) => row.label === label)) {
      rows.push({ label, metric });
    }
  });
  return rows;
}

function inferTableData(texts: string[]): { columns: Array<{ key: string; label: string }>; rows: Record<string, string>[] } | undefined {
  const headerStart = texts.findIndex((text) => text === '班组' || text === '设备');
  if (headerStart < 0) return undefined;
  const headerTexts = texts.slice(headerStart, headerStart + 4);
  if (headerTexts.length < 2) return undefined;
  const columns = headerTexts.map((label, index) => ({ key: `column${index + 1}`, label }));
  const rows: Record<string, string>[] = [];
  for (let index = headerStart + columns.length; index + columns.length <= texts.length && rows.length < 6; index += columns.length) {
    const values = texts.slice(index, index + columns.length);
    if (values.some((value) => ['开始时间', '结束时间', '时间区间'].includes(value))) break;
    rows.push(Object.fromEntries(values.map((value, valueIndex) => [columns[valueIndex]!.key, value])));
  }
  return rows.length ? { columns, rows } : undefined;
}

interface ParsedMetric { raw: string; value: string; unit: string; number: number; }

function parseMetric(text: string): ParsedMetric {
  const match = text.match(/[-+]?\d[\d,.]*(?:\.\d+)?/);
  const rawNumber = match?.[0] ?? '0';
  const value = rawNumber.replace(/,/g, '');
  const unit = text.slice((match?.index ?? text.length) + rawNumber.length).trim();
  return { raw: text, value, unit, number: Number(value) || 0 };
}

function isMetricText(text: string): boolean {
  return /[-+]?\d[\d,.]*(?:\.\d+)?/.test(text);
}

function isControlText(text: string): boolean {
  return /^(?:时间区间|开始日期|结束日期|开始时间|结束时间|压差对比|温差对比|单位[:：].*)$/.test(text);
}

function findMetricLabel(texts: string[], index: number, title: string): string | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = texts[cursor]!;
    if (isMetricText(candidate) || candidate === title || isControlText(candidate)) {
      continue;
    }
    return candidate;
  }
  const next = texts[index + 1];
  return next && !isMetricText(next) ? next : undefined;
}

function applyRecognizedAppearance(
  style: Record<string, unknown>,
  type: AiScreenComponentType,
  canvasAppearance?: AiScreenCanvasAppearance,
  componentAppearance?: AiScreenComponentAppearance,
): void {
  const appearance = {
    ...(canvasAppearance ? {
      panelBackgroundColor: canvasAppearance.panelBackgroundColor,
      panelBorderColor: canvasAppearance.panelBorderColor,
      panelRadius: canvasAppearance.panelRadius,
      titleColor: canvasAppearance.titleColor,
      textColor: canvasAppearance.textColor,
      valueColor: canvasAppearance.valueColor,
      accentColors: canvasAppearance.accentColors,
      ...(canvasAppearance.titleAccentColor ? { titleAccentColor: canvasAppearance.titleAccentColor } : {}),
    } : {}),
    ...componentAppearance,
  };
  if (!Object.keys(appearance).length) {
    return;
  }
  const mappings: Array<[keyof typeof appearance, string]> = [
    ['panelBackgroundColor', 'boardBackgroundColor'],
    ['panelBorderColor', 'boardBorderColor'],
    ['panelBorderWidth', 'boardBorderWidth'],
    ['panelRadius', 'boardRadius'],
    ['panelPadding', 'boardPadding'],
    ['titleColor', 'boardTitleColor'],
    ['titleSize', 'boardTitleSize'],
    ['titleAccentColor', 'boardTitleAccentColor'],
    ['textColor', type === 'text' ? 'color' : 'textColor'],
    ['valueColor', 'valueColor'],
    ['valueSize', 'valueSize'],
    ['accentColors', 'seriesColors'],
    ['iconName', 'iconName'],
    ['iconColor', 'iconColor'],
    ['iconBackgroundColor', 'iconBackgroundColor'],
    ['showPeriodTabs', 'showPeriodTabs'],
    ['activePeriodTab', 'activePeriodTab'],
    ['showDateRange', 'showDateRange'],
    ['dateRangeLabel', 'dateRangeLabel'],
    ['dateStartText', 'dateStartText'],
    ['dateEndText', 'dateEndText'],
    ['actionText', 'actionText'],
    ['showDemoTooltip', 'showDemoTooltip'],
    ['tooltipTitle', 'tooltipTitle'],
    ['tooltipPrimaryValue', 'tooltipPrimaryValue'],
    ['tooltipSecondaryValue', 'tooltipSecondaryValue'],
  ];
  mappings.forEach(([source, target]) => {
    if (appearance[source] !== undefined && target in style) {
      style[target] = cloneJson(appearance[source]);
    }
  });
  if (type === 'text' && appearance.titleColor !== undefined && 'color' in style) {
    style.color = appearance.titleColor;
  }
  if (type === 'text' && appearance.titleSize !== undefined && 'fontSize' in style) {
    style.fontSize = appearance.titleSize;
  }
  if (appearance.chart) {
    Object.entries(appearance.chart).forEach(([key, value]) => {
      if (key in style) {
        style[key] = value;
      }
    });
  }
}

/**
 * 同一行并排的多个单值 KPI 卡片若都没有识别出独立图标色，按页面强调色循环着色，
 * 还原参考图中蓝/绿/青交替的图标块，而不是全部退化为同一主色。
 */
function inferKpiRowIconColors(
  components: AiScreenStructureDraft['components'],
  accentColors: string[],
): Map<string, { iconColor: string; iconBackgroundColor: string }> {
  const result = new Map<string, { iconColor: string; iconBackgroundColor: string }>();
  const palette = accentColors.filter((color) => /^#[\da-f]{6}$/i.test(color));
  if (palette.length < 2) return result;
  const candidates = components
    .filter((component) => component.type === 'kpi' && !component.appearance?.iconColor)
    .sort((left, right) => left.bounds.y - right.bounds.y || left.bounds.x - right.bounds.x);
  const rows: Array<typeof candidates> = [];
  candidates.forEach((component) => {
    const row = rows[rows.length - 1];
    if (row && Math.abs(component.bounds.y - row[0]!.bounds.y) <= 32) {
      row.push(component);
    } else {
      rows.push([component]);
    }
  });
  rows.filter((row) => row.length >= 2).forEach((row) => {
    row.sort((left, right) => left.bounds.x - right.bounds.x).forEach((component, index) => {
      const color = palette[index % palette.length]!;
      result.set(component.id, { iconColor: color, iconBackgroundColor: hexToRgba(color, 0.18) });
    });
  });
  return result;
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function applyGeneratedVisualDefaults(
  style: Record<string, unknown>,
  component: AiScreenStructureDraft['components'][number],
  rowIconColor?: { iconColor: string; iconBackgroundColor: string },
): void {
  applyInferredAccessories(style, component);
  if ((component.type === 'kpi' || component.type === 'kpiList')
    && !component.appearance?.iconName
    && style.iconName === 'none') {
    const inferredIcon = inferKpiIconName(component);
    if (inferredIcon) style.iconName = inferredIcon;
  }
  if (component.type === 'kpi' && rowIconColor && style.iconName !== 'none') {
    if ('iconColor' in style) style.iconColor = rowIconColor.iconColor;
    if ('iconBackgroundColor' in style) style.iconBackgroundColor = rowIconColor.iconBackgroundColor;
  }
  if (component.type === 'gauge' && component.bounds.h <= 240) {
    if ('showLabel' in style) style.showLabel = false;
    if ('showSplitLine' in style) style.showSplitLine = true;
    if ('showProgress' in style) style.showProgress = true;
    if ('axisLineWidth' in style) style.axisLineWidth = 18;
    if ('splitNumber' in style) style.splitNumber = 10;
  }
  if (component.type !== 'pie') return;

  if ('showCenter' in style) style.showCenter = false;
  if ('centerText' in style) style.centerText = '';
  if (component.appearance?.accentColors?.length || !('seriesColors' in style)) return;

  const names = Array.isArray(component.mockData)
    ? component.mockData
      .filter(isRecord)
      .map((item) => String(item.name ?? ''))
    : [];
  if (names.includes('已解决') && names.includes('未解决')) {
    style.seriesColors = ['#3F67B7', '#C94848'];
  } else if (names.includes('算法') && names.includes('手动') && names.includes('PID')) {
    style.seriesColors = ['#3F67B7', '#36A77D', '#D58A3A'];
  }
}

function applyInferredAccessories(
  style: Record<string, unknown>,
  component: AiScreenStructureDraft['components'][number],
): void {
  const texts = component.visibleTexts;
  if (component.appearance?.showPeriodTabs === undefined
    && ['日', '月', '年'].every((tab) => texts.includes(tab))) {
    style.showPeriodTabs = true;
    style.activePeriodTab = '日';
  }
  if (component.appearance?.showDateRange === undefined && texts.includes('时间区间')) {
    style.showDateRange = true;
    style.dateRangeLabel = '时间区间';
    style.dateStartText = texts.find((text) => /开始(?:日期|时间)/.test(text)) ?? '开始日期';
    style.dateEndText = texts.find((text) => /结束(?:日期|时间)/.test(text)) ?? '结束日期';
  }
  if (!component.appearance?.actionText) {
    style.actionText = texts.find((text) => /^(?:更多(?:\s*>>)?|查看详情)$/.test(text)) ?? '';
  }
}

function inferKpiIconName(component: AiScreenStructureDraft['components'][number]): string | undefined {
  const label = `${component.name} ${component.title} ${component.visibleTexts.join(' ')}`;
  if (component.type === 'kpiList') {
    if (/分析/.test(component.name)) return undefined;
    return /网关|设备类型|流量计|阀门|告警|温度|压力|流量|供汽|用汽|供水|用水|管网|管道|班组|能耗|功率/.test(label)
      ? 'auto'
      : undefined;
  }
  if (/运行时间|运行时长/.test(label)) return 'clock';
  if (/班组|人员|用户/.test(label)) return 'users';
  if (/用汽|供汽|用水|供水|流量/.test(label)) return 'droplets';
  if (/告警|故障|异常/.test(label)) return 'alarm';
  if (/温度/.test(label)) return 'temperature';
  if (/压力/.test(label)) return 'pressure';
  if (/能耗|功率|用电/.test(label)) return 'zap';
  if (/产量|厂区|车间/.test(label)) return 'factory';
  return undefined;
}

/**
 * 纯文本组件：模型未给字号时按投影后的高度推断（页面主标题通常占 40~60px 高），
 * 横向居中于画布的文本视为居中标题。
 */
function applyInferredTextLayout(
  style: Record<string, unknown>,
  component: AiScreenStructureDraft['components'][number],
  bounds: { x: number; y: number; w: number; h: number },
  targetCanvas: { width: number; height: number },
): void {
  if (component.appearance?.titleSize === undefined && 'fontSize' in style) {
    const lines = Math.max(1, component.visibleTexts.length);
    style.fontSize = Math.min(32, Math.max(12, Math.round((bounds.h / lines) * 0.55)));
  }
  if ('align' in style) {
    const center = bounds.x + bounds.w / 2;
    const offset = Math.abs(center - targetCanvas.width / 2) / targetCanvas.width;
    if (offset <= 0.04) style.align = 'center';
    else if (bounds.x + bounds.w >= targetCanvas.width * 0.92) style.align = 'right';
  }
}

function applyRecognizedText(
  style: Record<string, unknown>,
  type: AiScreenComponentType,
  title: string,
  visibleTexts: string[],
): void {
  if (type === 'text') {
    style.content = visibleTexts.join(' ') || title;
    return;
  }
  if ('boardTitle' in style) {
    style.boardTitle = title;
  }
  if (type === 'border' && 'title' in style) {
    style.title = title;
  }
}

function inferTheme(backgroundColor: string): ComponentDoc['theme'] {
  const normalized = normalizeBackgroundColor(backgroundColor).slice(1);
  const [red, green, blue] = normalized.length === 3
    ? normalized.split('').map((value) => Number.parseInt(value + value, 16))
    : [normalized.slice(0, 2), normalized.slice(2, 4), normalized.slice(4, 6)].map((value) => Number.parseInt(value, 16));
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? 'light' : 'dark';
}

function normalizeBackgroundColor(color: string): string {
  return /^#[\da-f]{3}([\da-f]{3})?$/i.test(color) ? color : '#0D1730';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
