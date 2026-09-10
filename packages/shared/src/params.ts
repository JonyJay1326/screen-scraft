/** 同名参数注入：下拉框选中值写入目标 API 占位符 */

export interface NamedParam {
  name: string;
  type: 'string' | 'number';
  defaultValue?: unknown;
}

/**
 * 用 API 声明的 defaultValue 打底，再用运行时同名参数覆盖。
 */
export function resolveApiParams(
  declared: NamedParam[],
  runtime: Record<string, unknown> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  declared.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(runtime, item.name) && runtime[item.name] !== undefined && runtime[item.name] !== '') {
      out[item.name] = coerceParam(runtime[item.name], item.type);
    } else if (item.defaultValue !== undefined) {
      out[item.name] = coerceParam(item.defaultValue, item.type);
    }
  });
  return out;
}

/** 按声明类型强制转换 */
function coerceParam(value: unknown, type: 'string' | 'number'): unknown {
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return String(value ?? '');
}
