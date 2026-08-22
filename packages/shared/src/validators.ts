import type { AxisData, ProtocolKind } from './types';

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

export function isProtocolValid(kind: ProtocolKind | undefined, data: unknown): boolean {
  return validateProtocol(kind, data).length === 0;
}
