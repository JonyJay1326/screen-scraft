/** 将 :paramName 绑定为 JDBC 风格问号参数 */

export interface BoundSql {
  text: string;
  values: unknown[];
}

const WRITE_RE =
  /\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke|call|into\s+outfile|load\s+data)\b/i;

/**
 * 校验 SQL 仅为单条只读 SELECT。
 * 拒绝写操作、多语句、注释（防注释绕过）。
 */
export function assertReadOnlySelect(sql: string): void {
  const raw = sql.trim();
  if (!raw) {
    throw new Error('SQL 不能为空');
  }
  if (/--|\/\*|\*\//.test(raw)) {
    throw new Error('SQL 不允许包含注释');
  }
  const stripped = raw.replace(/;+\s*$/g, '');
  if (stripped.includes(';')) {
    throw new Error('SQL 不允许多语句');
  }
  if (!/^\s*select\b/i.test(stripped)) {
    throw new Error('只允许单条 SELECT');
  }
  if (WRITE_RE.test(stripped)) {
    throw new Error('SQL 含有非法写操作关键字');
  }
}

/**
 * 将 :name 占位符转为 ? 并按出现顺序收集值。
 * 未提供的参数填 null。
 */
export function bindNamedParams(sql: string, params: Record<string, unknown> = {}): BoundSql {
  const values: unknown[] = [];
  const text = sql.replace(/;+\s*$/g, '').replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_all, name: string) => {
    values.push(params[name] ?? null);
    return '?';
  });
  return { text, values };
}
