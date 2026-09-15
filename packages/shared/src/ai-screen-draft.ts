import type {
  AiScreenBackgroundLayerKind,
  AiScreenCanvasAppearance,
  AiScreenComponentAppearance,
  AiScreenComponentType,
  AiScreenDraftComponent,
  AiScreenStructureDraft,
} from './types';
import { AI_SCREEN_ICON_NAMES } from './types';
import {
  AI_SCREEN_ANALYSIS_COMPONENT_LIMIT,
  type AiValidationIssue,
} from './ai-validators';

const componentTypes = new Set<AiScreenComponentType>([
  'text', 'kpi', 'kpiList', 'line', 'bar', 'pie', 'gauge', 'table', 'border', 'unsupported',
]);
const backgroundLayerKinds = new Set<AiScreenBackgroundLayerKind>([
  'image', 'interactiveScene', 'video', 'unknown',
]);

/** 从后端解析值创建隔离的本地草稿；仅接受完整基础字段，不复用模型对象引用。 */
export function buildAiScreenStructureDraft(input: unknown): AiScreenStructureDraft | null {
  if (!isRecord(input) || !isRecord(input.canvas) || !Array.isArray(input.components)) {
    return null;
  }
  const width = integer(input.canvas.width);
  const height = integer(input.canvas.height);
  if (!width || !height || typeof input.canvas.backgroundColor !== 'string') {
    return null;
  }
  const backgroundLayer = input.canvas.backgroundLayer === undefined
    ? undefined
    : parseBackgroundLayer(input.canvas.backgroundLayer);
  if (input.canvas.backgroundLayer !== undefined && !backgroundLayer) {
    return null;
  }
  const appearance = parseCanvasAppearance(input.canvas.appearance);
  const components: AiScreenDraftComponent[] = [];
  for (const [index, value] of input.components.entries()) {
    const component = parseComponent(value, index);
    if (!component) {
      return null;
    }
    components.push(component);
  }
  if (!components.length || components.length > AI_SCREEN_ANALYSIS_COMPONENT_LIMIT) {
    return null;
  }
  return {
    canvas: {
      width,
      height,
      backgroundColor: input.canvas.backgroundColor,
      ...(appearance ? { appearance } : {}),
      ...(backgroundLayer ? { backgroundLayer } : {}),
    },
    components,
  };
}

/** 校验用户可编辑部分；返回项会阻止确认，但不修改草稿。 */
export function validateAiScreenStructureDraft(draft: AiScreenStructureDraft): AiValidationIssue[] {
  const issues: AiValidationIssue[] = [];
  const included = draft.components.filter((component) => component.included);
  if (!included.length) {
    issues.push({ path: '$.components', message: '至少保留 1 个组件' });
  }
  if (included.length > AI_SCREEN_ANALYSIS_COMPONENT_LIMIT) {
    issues.push({ path: '$.components', message: `最多保留 ${AI_SCREEN_ANALYSIS_COMPONENT_LIMIT} 个组件` });
  }
  included.forEach((component) => {
    const path = `$.components.${component.id}`;
    if (!component.name.trim()) {
      issues.push({ path: `${path}.name`, message: '组件名称不能为空' });
    }
    const { x, y, w, h } = component.bounds;
    if (![x, y, w, h].every((value) => Number.isInteger(value))) {
      issues.push({ path: `${path}.bounds`, message: '坐标和尺寸必须是整数' });
      return;
    }
    if (x < 0 || y < 0 || w < 1 || h < 1) {
      issues.push({ path: `${path}.bounds`, message: '坐标不能为负数，宽高必须大于 0' });
      return;
    }
    if (x + w > draft.canvas.width || y + h > draft.canvas.height) {
      issues.push({ path: `${path}.bounds`, message: '组件范围不能超出画布' });
    }
  });
  validateDraftOverlaps(included, issues);
  return issues;
}

function parseComponent(input: unknown, index: number): AiScreenDraftComponent | null {
  if (!isRecord(input) || !isRecord(input.bounds)) {
    return null;
  }
  const type = input.type;
  const order = integer(input.order);
  const x = integer(input.bounds.x, true);
  const y = integer(input.bounds.y, true);
  const w = integer(input.bounds.w);
  const h = integer(input.bounds.h);
  if (
    typeof type !== 'string' || !componentTypes.has(type as AiScreenComponentType)
    || order === null || x === null || y === null || w === null || h === null
    || typeof input.name !== 'string' || typeof input.title !== 'string'
    || !Array.isArray(input.visibleTexts) || !input.visibleTexts.every((value) => typeof value === 'string')
    || typeof input.seriesCount !== 'number' || !Number.isInteger(input.seriesCount)
    || typeof input.confidence !== 'number' || !Number.isFinite(input.confidence)
    || typeof input.notes !== 'string'
  ) {
    return null;
  }
  const appearance = parseComponentAppearance(input.appearance);
  return {
    id: `screen-draft-${index + 1}`,
    included: true,
    order,
    type: type as AiScreenComponentType,
    name: input.name,
    bounds: { x, y, w, h },
    title: input.title,
    visibleTexts: [...input.visibleTexts] as string[],
    seriesCount: input.seriesCount,
    ...(appearance ? { appearance } : {}),
    ...(input.mockData === undefined ? {} : { mockData: cloneJsonValue(input.mockData) }),
    ...(typeof input.dataConfidence === 'number' && Number.isFinite(input.dataConfidence)
      ? { dataConfidence: input.dataConfidence }
      : {}),
    confidence: input.confidence,
    notes: input.notes,
  };
}

function parseCanvasAppearance(input: unknown): AiScreenCanvasAppearance | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  const colorKeys = ['panelBackgroundColor', 'panelBorderColor', 'titleColor', 'textColor', 'valueColor'] as const;
  if (!colorKeys.every((key) => typeof input[key] === 'string')
    || !Array.isArray(input.accentColors) || !input.accentColors.every((color) => typeof color === 'string')
    || typeof input.panelRadius !== 'number' || !Number.isFinite(input.panelRadius)) {
    return undefined;
  }
  return {
    panelBackgroundColor: input.panelBackgroundColor as string,
    panelBorderColor: input.panelBorderColor as string,
    titleColor: input.titleColor as string,
    textColor: input.textColor as string,
    valueColor: input.valueColor as string,
    accentColors: [...input.accentColors] as string[],
    panelRadius: input.panelRadius,
    ...(typeof input.titleAccentColor === 'string' && input.titleAccentColor.trim()
      ? { titleAccentColor: input.titleAccentColor }
      : {}),
  };
}

function parseComponentAppearance(input: unknown): AiScreenComponentAppearance | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  const colorKeys = [
    'panelBackgroundColor', 'panelBorderColor', 'titleColor', 'textColor', 'valueColor',
    'iconColor', 'iconBackgroundColor',
  ] as const;
  colorKeys.forEach((key) => {
    if (typeof input[key] === 'string') {
      result[key] = input[key];
    }
  });
  ['panelBorderWidth', 'panelRadius', 'panelPadding', 'titleSize', 'valueSize'].forEach((key) => {
    if (typeof input[key] === 'number' && Number.isFinite(input[key])) {
      result[key] = input[key];
    }
  });
  if (Array.isArray(input.accentColors) && input.accentColors.every((color) => typeof color === 'string')) {
    result.accentColors = [...input.accentColors];
  }
  if (typeof input.iconName === 'string' && AI_SCREEN_ICON_NAMES.includes(input.iconName as typeof AI_SCREEN_ICON_NAMES[number])) {
    result.iconName = input.iconName;
  }
  ['showPeriodTabs', 'showDateRange', 'showDemoTooltip'].forEach((key) => {
    if (typeof input[key] === 'boolean') result[key] = input[key];
  });
  if (input.activePeriodTab === '日' || input.activePeriodTab === '月' || input.activePeriodTab === '年') {
    result.activePeriodTab = input.activePeriodTab;
  }
  ['dateRangeLabel', 'dateStartText', 'dateEndText', 'actionText', 'tooltipTitle', 'tooltipPrimaryValue', 'tooltipSecondaryValue'].forEach((key) => {
    if (typeof input[key] === 'string') result[key] = input[key];
  });
  if (isRecord(input.chart)) {
    result.chart = { ...input.chart };
  }
  return Object.keys(result).length ? result as AiScreenComponentAppearance : undefined;
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseBackgroundLayer(
  input: unknown,
): NonNullable<AiScreenStructureDraft['canvas']['backgroundLayer']> | null {
  if (!isRecord(input) || !isRecord(input.bounds)) {
    return null;
  }
  const x = integer(input.bounds.x, true);
  const y = integer(input.bounds.y, true);
  const w = integer(input.bounds.w);
  const h = integer(input.bounds.h);
  const kind = input.kind;
  if (
    x === null || y === null || w === null || h === null
    || typeof kind !== 'string' || !backgroundLayerKinds.has(kind as AiScreenBackgroundLayerKind)
    || typeof input.description !== 'string' || !input.description.trim()
    || typeof input.confidence !== 'number' || !Number.isFinite(input.confidence)
    || typeof input.notes !== 'string'
  ) {
    return null;
  }
  return {
    kind: kind as AiScreenBackgroundLayerKind,
    bounds: { x, y, w, h },
    description: input.description,
    confidence: input.confidence,
    notes: input.notes,
  };
}

function validateDraftOverlaps(components: AiScreenDraftComponent[], issues: AiValidationIssue[]): void {
  for (let leftIndex = 0; leftIndex < components.length; leftIndex += 1) {
    const left = components[leftIndex];
    if (!left || left.type === 'border') {
      continue;
    }
    for (let rightIndex = leftIndex + 1; rightIndex < components.length; rightIndex += 1) {
      const right = components[rightIndex];
      if (!right || right.type === 'border') {
        continue;
      }
      const intersectionWidth = Math.max(
        0,
        Math.min(left.bounds.x + left.bounds.w, right.bounds.x + right.bounds.w)
          - Math.max(left.bounds.x, right.bounds.x),
      );
      const intersectionHeight = Math.max(
        0,
        Math.min(left.bounds.y + left.bounds.h, right.bounds.y + right.bounds.h)
          - Math.max(left.bounds.y, right.bounds.y),
      );
      const smallerArea = Math.min(left.bounds.w * left.bounds.h, right.bounds.w * right.bounds.h);
      if (smallerArea > 0 && (intersectionWidth * intersectionHeight) / smallerArea >= 0.5) {
        issues.push({
          path: `$.components.${right.id}.bounds`,
          message: `${right.name} 与 ${left.name} 大面积重叠，请调整边界或排除其中一个`,
        });
      }
    }
  }
}

function integer(input: unknown, allowZero = false): number | null {
  if (!Number.isInteger(input) || typeof input !== 'number' || input < (allowZero ? 0 : 1)) {
    return null;
  }
  return input;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
