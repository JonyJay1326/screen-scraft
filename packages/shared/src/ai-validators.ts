import type {
  PageDoc,
  StyleField,
} from './types';

export interface AiValidationIssue {
  path: string;
  message: string;
}

export const AI_STRUCTURE_LIMITS = {
  maxDepth: 8,
  maxArrayLength: 64,
  maxObjectKeys: 64,
  maxStringLength: 1024,
  maxStyleFields: 64,
  maxPaletteColors: 16,
} as const;

const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor']);
const rendererKeys = new Set(['echarts-safe-v1', 'border-parametric-v1', 'border-nine-slice-v1']);
const chartFamilies = new Set(['line', 'bar', 'pie', 'combo', 'funnel', 'radar', 'gauge']);
const protocolKinds = new Set([
  'axis', 'combo', 'radar', 'nameValue', 'table', 'options', 'weather',
  'kpi-1', 'kpi-2', 'kpi-3', 'kpi-5', 'kpi-8', 'kpi-list',
]);

/** 校验 AI 对已有组件产生的样式补丁。 */
export function validateAiStylePatch(
  styleSchema: StyleField[],
  patch: unknown,
): AiValidationIssue[] {
  const issues = validateStructure(patch);
  if (!isPlainRecord(patch)) {
    return append(issues, '$', '样式补丁必须是普通对象');
  }
  const fields = new Map(styleSchema.map((item) => [item.key, item]));
  for (const [key, value] of Object.entries(patch)) {
    const field = fields.get(key);
    const path = `$.${key}`;
    if (!field) {
      issues.push({ path, message: '字段未在目标 styleSchema 中声明' });
      continue;
    }
    if (!field.aiWritable || field.readOnly) {
      issues.push({ path, message: '字段不允许 AI 修改' });
      continue;
    }
    issues.push(...validateStyleValue(field, value, path));
  }
  return issues;
}

/** 校验安全图表描述；只接受批准的纯声明式字段。 */
export function validateSafeChartSpec(input: unknown): AiValidationIssue[] {
  const issues = validateStructure(input);
  if (!isPlainRecord(input)) {
    return append(issues, '$', 'SafeChartSpec 必须是普通对象');
  }
  strictKeys(input, ['kind', 'schemaVersion', 'family', 'option'], '$', issues);
  literal(input.kind, 'chart', '$.kind', issues);
  literal(input.schemaVersion, 1, '$.schemaVersion', issues);
  if (typeof input.family !== 'string' || !chartFamilies.has(input.family)) {
    issues.push({ path: '$.family', message: '不支持的图表族' });
  }
  if (!isPlainRecord(input.option)) {
    issues.push({ path: '$.option', message: 'option 必须是普通对象' });
    return issues;
  }
  const option = input.option;

  const family = typeof input.family === 'string' ? input.family : '';
  const familyKeys = family === 'combo' ? ['line', 'bar'] : chartFamilies.has(family) ? [family] : [];
  strictKeys(option, ['grid', 'palette', 'legend', 'axis', ...familyKeys], '$.option', issues);
  familyKeys.forEach((key) => {
    if (option[key] === undefined) {
      issues.push({ path: `$.option.${key}`, message: '缺少图表族配置' });
    }
  });
  validateChartOption(option, family, issues);
  return issues;
}

/** 校验参数化边框描述。 */
export function validateSafeBorderSpec(input: unknown): AiValidationIssue[] {
  const issues = validateStructure(input);
  if (!isPlainRecord(input)) {
    return append(issues, '$', 'SafeBorderSpec 必须是普通对象');
  }
  strictKeys(input, [
    'kind', 'schemaVersion', 'cornerType', 'cornerSize', 'primaryColor', 'accentColor',
    'backgroundColor', 'lineWidth', 'lineOpacity', 'innerGlow', 'outerGlow',
    'glowOpacity', 'titlePosition', 'contentPadding',
  ], '$', issues);
  literal(input.kind, 'border', '$.kind', issues);
  literal(input.schemaVersion, 1, '$.schemaVersion', issues);
  enumValue(input.cornerType, ['cut', 'bracket', 'notch', 'line'], '$.cornerType', issues);
  numberValue(input.cornerSize, 0, 160, '$.cornerSize', issues);
  colorValue(input.primaryColor, '$.primaryColor', issues);
  colorValue(input.accentColor, '$.accentColor', issues);
  colorValue(input.backgroundColor, '$.backgroundColor', issues);
  numberValue(input.lineWidth, 0, 24, '$.lineWidth', issues);
  numberValue(input.lineOpacity, 0, 1, '$.lineOpacity', issues);
  numberValue(input.innerGlow, 0, 64, '$.innerGlow', issues);
  numberValue(input.outerGlow, 0, 64, '$.outerGlow', issues);
  numberValue(input.glowOpacity, 0, 1, '$.glowOpacity', issues);
  enumValue(input.titlePosition, ['none', 'topLeft', 'topCenter'], '$.titlePosition', issues);
  numberValue(input.contentPadding, 0, 160, '$.contentPadding', issues);
  return issues;
}

/** 校验动态组件自包含快照；九宫格能力默认保持关闭。 */
export function validateComponentDefinitionSnapshot(
  input: unknown,
  options: { allowNineSlice?: boolean } = {},
): AiValidationIssue[] {
  const issues = validateStructure(input);
  if (!isPlainRecord(input)) {
    return append(issues, '$', '组件定义快照必须是普通对象');
  }
  strictKeys(input, [
    'source', 'presetId', 'rendererKey', 'specVersion', 'category', 'group',
    'dataProtocol', 'defaultSize', 'styleSchema', 'styleMode', 'defaultStyle', 'safeSpec',
  ], '$', issues);
  enumValue(input.source, ['generated', 'personal', 'public'], '$.source', issues);
  if (input.presetId !== undefined) {
    nonEmptyString(input.presetId, '$.presetId', issues, 128);
  }
  enumValue(input.rendererKey, [...rendererKeys], '$.rendererKey', issues);
  integerValue(input.specVersion, 1, 1_000_000, '$.specVersion', issues);
  enumValue(input.category, ['chart', 'decoration'], '$.category', issues);
  enumValue(input.group, ['line', 'bar', 'pie', 'combo', 'funnel', 'radar', 'gauge', 'border'], '$.group', issues);
  if (input.dataProtocol !== undefined) {
    enumValue(input.dataProtocol, [...protocolKinds], '$.dataProtocol', issues);
  }

  if (isPlainRecord(input.defaultSize)) {
    strictKeys(input.defaultSize, ['w', 'h'], '$.defaultSize', issues);
    integerValue(input.defaultSize.w, 40, 8192, '$.defaultSize.w', issues);
    integerValue(input.defaultSize.h, 40, 8192, '$.defaultSize.h', issues);
  } else {
    issues.push({ path: '$.defaultSize', message: 'defaultSize 必须是普通对象' });
  }

  const styleSchema = validateStyleSchema(input.styleSchema, issues);
  enumValue(input.styleMode, ['editable', 'locked'], '$.styleMode', issues);
  if (input.styleMode === 'locked' && styleSchema.some((item) => item.aiWritable && !item.readOnly)) {
    issues.push({ path: '$.styleSchema', message: '锁定样式组件不能包含可写字段' });
  }
  validateDefaultStyle(input.defaultStyle, styleSchema, issues);
  validateRendererSpecPair(input, options, issues);
  return issues;
}

export function isAiContractValid(issues: AiValidationIssue[]): boolean {
  return issues.length === 0;
}

/** 保存大屏前校验所有动态组件快照；内置组件不受影响。 */
export function validatePageComponentDefinitions(pages: PageDoc[]): AiValidationIssue[] {
  const issues: AiValidationIssue[] = [];
  pages.forEach((page, pageIndex) => {
    page.components.forEach((component, componentIndex) => {
      const path = `$.pages[${pageIndex}].components[${componentIndex}]`;
      if (component.templateId.startsWith('custom:') && !component.definitionSnapshot) {
        issues.push({ path: `${path}.definitionSnapshot`, message: '动态组件必须包含定义快照' });
        return;
      }
      if (component.definitionSnapshot) {
        issues.push(...prefixIssues(validateComponentDefinitionSnapshot(component.definitionSnapshot), `${path}.definitionSnapshot`));
      }
    });
  });
  return issues;
}

function validateRendererSpecPair(
  input: Record<string, unknown>,
  options: { allowNineSlice?: boolean },
  issues: AiValidationIssue[],
): void {
  if (input.rendererKey === 'border-nine-slice-v1' && !options.allowNineSlice) {
    issues.push({ path: '$.rendererKey', message: '九宫格图片边框能力尚未启用' });
    return;
  }
  if (input.rendererKey === 'echarts-safe-v1') {
    if (input.category !== 'chart' || input.group === 'border') {
      issues.push({ path: '$.rendererKey', message: '图表 renderer 与分类不匹配' });
    }
    if (input.dataProtocol === undefined) {
      issues.push({ path: '$.dataProtocol', message: '安全图表必须声明数据协议' });
    }
    issues.push(...prefixIssues(validateSafeChartSpec(input.safeSpec), '$.safeSpec'));
    if (isPlainRecord(input.safeSpec) && input.safeSpec.family !== input.group) {
      issues.push({ path: '$.safeSpec.family', message: '图表族必须与组件分组一致' });
    }
    return;
  }
  if (input.rendererKey === 'border-parametric-v1') {
    if (input.category !== 'decoration' || input.group !== 'border' || input.dataProtocol !== undefined) {
      issues.push({ path: '$.rendererKey', message: '边框 renderer 与分类或数据协议不匹配' });
    }
    issues.push(...prefixIssues(validateSafeBorderSpec(input.safeSpec), '$.safeSpec'));
    return;
  }
  if (input.rendererKey === 'border-nine-slice-v1' && options.allowNineSlice) {
    validateNineSliceSpec(input.safeSpec, issues);
  }
}

function validateStyleSchema(input: unknown, issues: AiValidationIssue[]): StyleField[] {
  if (!Array.isArray(input)) {
    issues.push({ path: '$.styleSchema', message: 'styleSchema 必须是数组' });
    return [];
  }
  if (input.length > AI_STRUCTURE_LIMITS.maxStyleFields) {
    issues.push({ path: '$.styleSchema', message: `样式字段不能超过 ${AI_STRUCTURE_LIMITS.maxStyleFields} 个` });
  }
  const result: StyleField[] = [];
  const keys = new Set<string>();
  input.forEach((value, index) => {
    const path = `$.styleSchema[${index}]`;
    if (!isPlainRecord(value)) {
      issues.push({ path, message: '样式字段必须是普通对象' });
      return;
    }
    strictKeys(value, ['key', 'label', 'type', 'options', 'min', 'max', 'step', 'unit', 'group', 'aiWritable', 'readOnly'], path, issues);
    nonEmptyString(value.key, `${path}.key`, issues, 64);
    nonEmptyString(value.label, `${path}.label`, issues, 64);
    nonEmptyString(value.group, `${path}.group`, issues, 64);
    enumValue(value.type, ['text', 'number', 'switch', 'color', 'select', 'colorList'], `${path}.type`, issues);
    if (typeof value.aiWritable !== 'boolean') {
      issues.push({ path: `${path}.aiWritable`, message: 'aiWritable 必须是布尔值' });
    }
    if (value.readOnly !== undefined && typeof value.readOnly !== 'boolean') {
      issues.push({ path: `${path}.readOnly`, message: 'readOnly 必须是布尔值' });
    }
    if (typeof value.key === 'string') {
      if (dangerousKeys.has(value.key)) {
        issues.push({ path: `${path}.key`, message: '禁止危险字段名' });
      } else if (keys.has(value.key)) {
        issues.push({ path: `${path}.key`, message: '样式字段名重复' });
      }
      keys.add(value.key);
    }
    if (value.type === 'number') {
      optionalNumber(value.min, `${path}.min`, issues);
      optionalNumber(value.max, `${path}.max`, issues);
      optionalNumber(value.step, `${path}.step`, issues);
      if (typeof value.min === 'number' && typeof value.max === 'number' && value.min > value.max) {
        issues.push({ path, message: 'min 不能大于 max' });
      }
    }
    if (value.type === 'select') {
      validateOptions(value.options, `${path}.options`, issues);
    }
    result.push(value as unknown as StyleField);
  });
  return result;
}

function validateDefaultStyle(input: unknown, schema: StyleField[], issues: AiValidationIssue[]): void {
  if (!isPlainRecord(input)) {
    issues.push({ path: '$.defaultStyle', message: 'defaultStyle 必须是普通对象' });
    return;
  }
  strictKeys(input, ['dark', 'light'], '$.defaultStyle', issues);
  const fields = new Map(schema.map((item) => [item.key, item]));
  for (const theme of ['dark', 'light'] as const) {
    const values = input[theme];
    if (!isPlainRecord(values)) {
      issues.push({ path: `$.defaultStyle.${theme}`, message: `${theme} 必须是普通对象` });
      continue;
    }
    for (const [key, value] of Object.entries(values)) {
      const field = fields.get(key);
      const path = `$.defaultStyle.${theme}.${key}`;
      if (!field) {
        issues.push({ path, message: '默认样式字段未在 styleSchema 中声明' });
      } else {
        issues.push(...validateStyleValue(field, value, path));
      }
    }
  }
}

function validateStyleValue(field: StyleField, value: unknown, path: string): AiValidationIssue[] {
  const issues: AiValidationIssue[] = [];
  if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return [{ path, message: '值必须是有限数字' }];
    }
    if (field.min !== undefined && value < field.min) {
      issues.push({ path, message: `值不能小于 ${field.min}` });
    }
    if (field.max !== undefined && value > field.max) {
      issues.push({ path, message: `值不能大于 ${field.max}` });
    }
  } else if (field.type === 'switch') {
    if (typeof value !== 'boolean') {
      issues.push({ path, message: '值必须是布尔值' });
    }
  } else if (field.type === 'color') {
    colorValue(value, path, issues);
  } else if (field.type === 'colorList') {
    if (!Array.isArray(value) || value.length === 0 || value.length > AI_STRUCTURE_LIMITS.maxPaletteColors) {
      issues.push({ path, message: `颜色列表长度必须为 1~${AI_STRUCTURE_LIMITS.maxPaletteColors}` });
    } else {
      value.forEach((item, index) => colorValue(item, `${path}[${index}]`, issues));
    }
  } else if (field.type === 'select') {
    if (typeof value !== 'string' || !field.options?.some((item) => item.value === value)) {
      issues.push({ path, message: '值不在允许选项中' });
    }
  } else if (typeof value !== 'string' || value.length > AI_STRUCTURE_LIMITS.maxStringLength) {
    issues.push({ path, message: `值必须是长度不超过 ${AI_STRUCTURE_LIMITS.maxStringLength} 的字符串` });
  }
  return issues;
}

function validateChartOption(option: Record<string, unknown>, family: string, issues: AiValidationIssue[]): void {
  if (option.grid !== undefined) {
    validateNumberBlock(option.grid, ['left', 'right', 'top', 'bottom'], 0, 2048, '$.option.grid', issues);
  }
  if (option.palette !== undefined) {
    if (!Array.isArray(option.palette) || option.palette.length === 0 || option.palette.length > AI_STRUCTURE_LIMITS.maxPaletteColors) {
      issues.push({ path: '$.option.palette', message: `颜色列表长度必须为 1~${AI_STRUCTURE_LIMITS.maxPaletteColors}` });
    } else {
      option.palette.forEach((value, index) => colorValue(value, `$.option.palette[${index}]`, issues));
    }
  }
  if (option.legend !== undefined) {
    validateMixedBlock(option.legend, '$.option.legend', issues, {
      show: (value, path) => booleanValue(value, path, issues),
      position: (value, path) => enumValue(value, ['top', 'topRight', 'bottom'], path, issues),
    });
  }
  if (option.axis !== undefined) {
    validateMixedBlock(option.axis, '$.option.axis', issues, {
      showX: (value, path) => booleanValue(value, path, issues),
      showY: (value, path) => booleanValue(value, path, issues),
      labelColor: (value, path) => colorValue(value, path, issues),
      gridColor: (value, path) => colorValue(value, path, issues),
    });
  }
  if ((family === 'line' || family === 'combo') && option.line !== undefined) {
    validateMixedBlock(option.line, '$.option.line', issues, {
      smooth: (value, path) => booleanValue(value, path, issues),
      width: (value, path) => numberValue(value, 1, 20, path, issues),
      areaOpacity: (value, path) => numberValue(value, 0, 1, path, issues),
      symbol: (value, path) => enumValue(value, ['none', 'circle', 'rect'], path, issues),
    });
  }
  if ((family === 'bar' || family === 'combo') && option.bar !== undefined) {
    validateMixedBlock(option.bar, '$.option.bar', issues, {
      width: (value, path) => numberValue(value, 1, 100, path, issues),
      radius: (value, path) => numberValue(value, 0, 50, path, issues),
      stack: (value, path) => booleanValue(value, path, issues),
      horizontal: (value, path) => booleanValue(value, path, issues),
    });
  }
  if (family === 'pie' && option.pie !== undefined) {
    validateMixedBlock(option.pie, '$.option.pie', issues, {
      innerRadius: (value, path) => numberValue(value, 0, 99, path, issues),
      outerRadius: (value, path) => numberValue(value, 1, 100, path, issues),
      roseType: (value, path) => enumValue(value, ['none', 'radius', 'area'], path, issues),
    });
    if (isPlainRecord(option.pie) && typeof option.pie.innerRadius === 'number' && typeof option.pie.outerRadius === 'number' && option.pie.innerRadius >= option.pie.outerRadius) {
      issues.push({ path: '$.option.pie', message: '内径必须小于外径' });
    }
  }
  if (family === 'funnel' && option.funnel !== undefined) {
    validateMixedBlock(option.funnel, '$.option.funnel', issues, {
      sort: (value, path) => enumValue(value, ['ascending', 'descending'], path, issues),
      align: (value, path) => enumValue(value, ['left', 'center', 'right'], path, issues),
      gap: (value, path) => numberValue(value, 0, 64, path, issues),
    });
  }
  if (family === 'radar' && option.radar !== undefined) {
    validateMixedBlock(option.radar, '$.option.radar', issues, {
      shape: (value, path) => enumValue(value, ['polygon', 'circle'], path, issues),
      splitNumber: (value, path) => integerValue(value, 2, 12, path, issues),
      areaOpacity: (value, path) => numberValue(value, 0, 1, path, issues),
    });
  }
  if (family === 'gauge' && option.gauge !== undefined) {
    validateMixedBlock(option.gauge, '$.option.gauge', issues, {
      min: (value, path) => numberValue(value, -1_000_000, 1_000_000, path, issues),
      max: (value, path) => numberValue(value, -1_000_000, 1_000_000, path, issues),
      startAngle: (value, path) => numberValue(value, -360, 360, path, issues),
      endAngle: (value, path) => numberValue(value, -360, 360, path, issues),
      showPointer: (value, path) => booleanValue(value, path, issues),
      showProgress: (value, path) => booleanValue(value, path, issues),
    });
    if (isPlainRecord(option.gauge) && typeof option.gauge.min === 'number' && typeof option.gauge.max === 'number' && option.gauge.min >= option.gauge.max) {
      issues.push({ path: '$.option.gauge', message: '最小值必须小于最大值' });
    }
  }
}

function validateNineSliceSpec(input: unknown, issues: AiValidationIssue[]): void {
  if (!isPlainRecord(input)) {
    issues.push({ path: '$.safeSpec', message: 'SafeNineSliceSpec 必须是普通对象' });
    return;
  }
  strictKeys(input, ['kind', 'schemaVersion', 'assetId', 'slice'], '$.safeSpec', issues);
  literal(input.kind, 'nineSlice', '$.safeSpec.kind', issues);
  literal(input.schemaVersion, 1, '$.safeSpec.schemaVersion', issues);
  nonEmptyString(input.assetId, '$.safeSpec.assetId', issues, 128);
  if (isPlainRecord(input.slice)) {
    strictKeys(input.slice, ['top', 'right', 'bottom', 'left'], '$.safeSpec.slice', issues);
    for (const key of ['top', 'right', 'bottom', 'left']) {
      integerValue(input.slice[key], 0, 4096, `$.safeSpec.slice.${key}`, issues);
    }
  } else {
    issues.push({ path: '$.safeSpec.slice', message: 'slice 必须是普通对象' });
  }
}

function validateStructure(input: unknown, path = '$', depth = 0): AiValidationIssue[] {
  if (depth > AI_STRUCTURE_LIMITS.maxDepth) {
    return [{ path, message: `对象深度不能超过 ${AI_STRUCTURE_LIMITS.maxDepth}` }];
  }
  if (typeof input === 'string') {
    return input.length > AI_STRUCTURE_LIMITS.maxStringLength
      ? [{ path, message: `字符串长度不能超过 ${AI_STRUCTURE_LIMITS.maxStringLength}` }]
      : [];
  }
  if (Array.isArray(input)) {
    const issues: AiValidationIssue[] = [];
    if (input.length > AI_STRUCTURE_LIMITS.maxArrayLength) {
      issues.push({ path, message: `数组长度不能超过 ${AI_STRUCTURE_LIMITS.maxArrayLength}` });
    }
    input.slice(0, AI_STRUCTURE_LIMITS.maxArrayLength).forEach((item, index) => {
      issues.push(...validateStructure(item, `${path}[${index}]`, depth + 1));
    });
    return issues;
  }
  if (input && typeof input === 'object') {
    if (!isPlainRecord(input)) {
      return [{ path, message: '只允许普通对象' }];
    }
    const issues: AiValidationIssue[] = [];
    const keys = Object.keys(input);
    if (keys.length > AI_STRUCTURE_LIMITS.maxObjectKeys) {
      issues.push({ path, message: `对象字段不能超过 ${AI_STRUCTURE_LIMITS.maxObjectKeys}` });
    }
    keys.slice(0, AI_STRUCTURE_LIMITS.maxObjectKeys).forEach((key) => {
      if (dangerousKeys.has(key)) {
        issues.push({ path: `${path}.${key}`, message: '禁止危险字段名' });
      } else {
        issues.push(...validateStructure(input[key], `${path}.${key}`, depth + 1));
      }
    });
    return issues;
  }
  return [];
}

function validateNumberBlock(input: unknown, keys: string[], min: number, max: number, path: string, issues: AiValidationIssue[]): void {
  if (!isPlainRecord(input)) {
    issues.push({ path, message: '必须是普通对象' });
    return;
  }
  strictKeys(input, keys, path, issues);
  keys.forEach((key) => numberValue(input[key], min, max, `${path}.${key}`, issues));
}

function validateMixedBlock(
  input: unknown,
  path: string,
  issues: AiValidationIssue[],
  validators: Record<string, (value: unknown, path: string) => void>,
): void {
  if (!isPlainRecord(input)) {
    issues.push({ path, message: '必须是普通对象' });
    return;
  }
  const keys = Object.keys(validators);
  strictKeys(input, keys, path, issues);
  keys.forEach((key) => validators[key](input[key], `${path}.${key}`));
}

function strictKeys(input: Record<string, unknown>, allowed: string[], path: string, issues: AiValidationIssue[]): void {
  const allowedSet = new Set(allowed);
  Object.keys(input).forEach((key) => {
    if (!allowedSet.has(key)) {
      issues.push({ path: `${path}.${key}`, message: '字段不在白名单中' });
    }
  });
}

function validateOptions(input: unknown, path: string, issues: AiValidationIssue[]): void {
  if (!Array.isArray(input) || input.length === 0 || input.length > 32) {
    issues.push({ path, message: 'select 必须包含 1~32 个选项' });
    return;
  }
  input.forEach((option, index) => {
    if (!isPlainRecord(option)) {
      issues.push({ path: `${path}[${index}]`, message: '选项必须是普通对象' });
      return;
    }
    strictKeys(option, ['label', 'value'], `${path}[${index}]`, issues);
    nonEmptyString(option.label, `${path}[${index}].label`, issues, 64);
    nonEmptyString(option.value, `${path}[${index}].value`, issues, 64);
  });
}

function colorValue(value: unknown, path: string, issues: AiValidationIssue[]): void {
  if (typeof value !== 'string' || !isSafeColor(value)) {
    issues.push({ path, message: '颜色只允许十六进制、rgb/rgba、hsl/hsla 或 transparent' });
  }
}

function isSafeColor(value: string): boolean {
  const color = value.trim();
  if (color === 'transparent') {
    return true;
  }
  if (/^#[0-9a-fA-F]{3,4}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/.test(color)) {
    return true;
  }
  return /^(?:rgb|rgba|hsl|hsla)\([\d\s.,%+-]+\)$/.test(color);
}

function literal(value: unknown, expected: string | number, path: string, issues: AiValidationIssue[]): void {
  if (value !== expected) {
    issues.push({ path, message: `值必须为 ${expected}` });
  }
}

function enumValue(value: unknown, allowed: string[], path: string, issues: AiValidationIssue[]): void {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    issues.push({ path, message: `值必须为 ${allowed.join(' / ')}` });
  }
}

function booleanValue(value: unknown, path: string, issues: AiValidationIssue[]): void {
  if (typeof value !== 'boolean') {
    issues.push({ path, message: '值必须是布尔值' });
  }
}

function numberValue(value: unknown, min: number, max: number, path: string, issues: AiValidationIssue[]): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    issues.push({ path, message: `值必须是 ${min}~${max} 的有限数字` });
  }
}

function integerValue(value: unknown, min: number, max: number, path: string, issues: AiValidationIssue[]): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    issues.push({ path, message: `值必须是 ${min}~${max} 的整数` });
  }
}

function optionalNumber(value: unknown, path: string, issues: AiValidationIssue[]): void {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
    issues.push({ path, message: '值必须是有限数字' });
  }
}

function nonEmptyString(value: unknown, path: string, issues: AiValidationIssue[], max: number): void {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    issues.push({ path, message: `值必须是长度 1~${max} 的字符串` });
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function prefixIssues(issues: AiValidationIssue[], prefix: string): AiValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path === '$' ? prefix : `${prefix}${issue.path.slice(1)}`,
  }));
}

function append(issues: AiValidationIssue[], path: string, message: string): AiValidationIssue[] {
  issues.push({ path, message });
  return issues;
}
