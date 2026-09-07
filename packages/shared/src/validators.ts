import type {
  AxisData,
  ComboData,
  NameValueData,
  ProtocolKind,
  RadarData,
  TableData,
  TencentWeatherData,
} from './types';

export interface ProtocolIssue {
  message: string;
}

/** 校验组件数据是否符合协议；多余字段容忍 */
export function validateProtocol(kind: ProtocolKind | undefined, data: unknown): ProtocolIssue[] {
  if (!kind) {
    return [];
  }
  switch (kind) {
    case 'axis':
      return validateAxis(data);
    case 'combo':
      return validateCombo(data);
    case 'radar':
      return validateRadar(data);
    case 'nameValue':
      return validateNameValue(data);
    case 'table':
      return validateTable(data);
    case 'options':
      return validateOptions(data);
    case 'weather':
      return validateWeather(data);
    case 'kpi-1':
      return validateKpiList(data, ['name', 'value', 'unit', 'trend', 'trendDir']);
    case 'kpi-2':
      return validateKpiList(data, ['name', 'value', 'unit']);
    case 'kpi-3':
      return validateKpi3(data);
    case 'kpi-5':
      return validateKpi5(data);
    case 'kpi-8':
      return validateKpiList(data, ['name', 'value', 'unit']);
    case 'kpi-list':
      return validateKpiList(data, ['name', 'value']);
    default:
      return data == null ? [{ message: '数据不能为空' }] : [];
  }
}

/** 坐标轴族 */
export function validateAxis(data: unknown): ProtocolIssue[] {
  const issues: ProtocolIssue[] = [];
  if (!data || typeof data !== 'object') {
    return [{ message: 'axis 协议需为对象' }];
  }
  const body = data as Partial<AxisData>;
  if (!Array.isArray(body.categories) || body.categories.some((item) => typeof item !== 'string')) {
    issues.push({ message: 'categories 必须是字符串数组' });
  }
  if (!Array.isArray(body.series)) {
    issues.push({ message: 'series 必须是数组' });
    return issues;
  }
  body.series.forEach((serie, index) => {
    if (!serie || typeof serie !== 'object') {
      issues.push({ message: `series[${index}] 非法` });
      return;
    }
    if (typeof serie.name !== 'string') {
      issues.push({ message: `series[${index}].name 必须是字符串` });
    }
    if (!Array.isArray(serie.data) || serie.data.some((item) => typeof item !== 'number')) {
      issues.push({ message: `series[${index}].data 必须是数字数组` });
    }
  });
  return issues;
}

/** 组合图 */
export function validateCombo(data: unknown): ProtocolIssue[] {
  const issues = validateAxis(data);
  if (!data || typeof data !== 'object') {
    return issues;
  }
  const body = data as Partial<ComboData>;
  body.series?.forEach((serie, index) => {
    if (serie && typeof serie === 'object' && serie.type !== 'line' && serie.type !== 'bar') {
      issues.push({ message: `series[${index}].type 必须是 line 或 bar` });
    }
  });
  return issues;
}

/** 雷达图 */
export function validateRadar(data: unknown): ProtocolIssue[] {
  const issues: ProtocolIssue[] = [];
  if (!data || typeof data !== 'object') {
    return [{ message: 'radar 协议需为对象' }];
  }
  const body = data as Partial<RadarData>;
  if (!Array.isArray(body.indicators) || !body.indicators.length || body.indicators.some((item) => !item || typeof item.name !== 'string')) {
    issues.push({ message: 'indicators 必须含 name' });
  }
  if (!Array.isArray(body.series)) {
    issues.push({ message: 'series 必须是数组' });
  } else {
    body.series.forEach((serie, index) => {
      if (!serie || typeof serie.name !== 'string' || !Array.isArray(serie.data)) {
        issues.push({ message: `series[${index}] 非法` });
      }
    });
  }
  return issues;
}

/** 名值族 */
export function validateNameValue(data: unknown): ProtocolIssue[] {
  if (!Array.isArray(data)) {
    return [{ message: 'nameValue 协议需为数组' }];
  }
  const issues: ProtocolIssue[] = [];
  (data as NameValueData).forEach((item, index) => {
    if (!item || typeof item.name !== 'string' || typeof item.value !== 'number') {
      issues.push({ message: `[${index}] 需含 name/value` });
    }
  });
  return issues;
}

/** 表格 */
export function validateTable(data: unknown): ProtocolIssue[] {
  if (!data || typeof data !== 'object') {
    return [{ message: 'table 协议需为对象' }];
  }
  const body = data as Partial<TableData>;
  const issues: ProtocolIssue[] = [];
  if (!Array.isArray(body.columns) || !body.columns.length || body.columns.some((col) => !col || typeof col.key !== 'string' || typeof col.label !== 'string')) {
    issues.push({ message: 'columns 必须含 key/label' });
  }
  if (!Array.isArray(body.rows)) {
    issues.push({ message: 'rows 必须是数组' });
  }
  return issues;
}

/** 下拉选项 */
export function validateOptions(data: unknown): ProtocolIssue[] {
  if (!Array.isArray(data)) {
    return [{ message: 'options 协议需为数组' }];
  }
  const issues: ProtocolIssue[] = [];
  data.forEach((item, index) => {
    if (!item || typeof item !== 'object' || typeof (item as { label: string }).label !== 'string' || typeof (item as { value: string }).value !== 'string') {
      issues.push({ message: `[${index}] 需含 label/value 字符串` });
    }
  });
  return issues;
}

/** 天气（腾讯结构） */
export function validateWeather(data: unknown): ProtocolIssue[] {
  if (!data || typeof data !== 'object') {
    return [{ message: 'weather 协议需为对象' }];
  }
  const body = data as Partial<TencentWeatherData>;
  if (!Array.isArray(body.result?.realtime) || !body.result.realtime[0]) {
    return [{ message: '缺少 result.realtime[0]' }];
  }
  return [];
}

/** 指标卡列表型 */
function validateKpiList(data: unknown, keys: string[]): ProtocolIssue[] {
  if (!Array.isArray(data) || !data.length) {
    return [{ message: '指标卡数据需为非空数组' }];
  }
  const issues: ProtocolIssue[] = [];
  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      issues.push({ message: `[${index}] 非法` });
      return;
    }
    const row = item as Record<string, unknown>;
    keys.forEach((key) => {
      if (row[key] === undefined) {
        issues.push({ message: `[${index}] 缺少 ${key}` });
      }
    });
  });
  return issues;
}

/** 样式3 中心+两侧 */
function validateKpi3(data: unknown): ProtocolIssue[] {
  if (!data || typeof data !== 'object') {
    return [{ message: 'kpi-3 需为对象' }];
  }
  const body = data as { center?: { name?: string; value?: unknown }; sides?: unknown };
  if (!body.center || typeof body.center.name !== 'string') {
    return [{ message: '缺少 center.name' }];
  }
  if (!Array.isArray(body.sides)) {
    return [{ message: 'sides 必须是数组' }];
  }
  return [];
}

/** 样式5 单指标 */
function validateKpi5(data: unknown): ProtocolIssue[] {
  if (!data || typeof data !== 'object') {
    return [{ message: 'kpi-5 需为对象' }];
  }
  const body = data as { name?: string; value?: unknown; unit?: string };
  if (typeof body.name !== 'string' || body.value === undefined) {
    return [{ message: '缺少 name/value' }];
  }
  return [];
}

/** 是否符合协议 */
export function isProtocolValid(kind: ProtocolKind | undefined, data: unknown): boolean {
  return validateProtocol(kind, data).length === 0;
}
