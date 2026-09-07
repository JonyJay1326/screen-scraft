import { describe, expect, it } from 'vitest';
import { resolveApiParams } from '../params';

describe('同名参数注入', () => {
  const declared = [
    { name: 'region', type: 'string' as const, defaultValue: 'all' },
    { name: 'limit', type: 'number' as const, defaultValue: 10 },
  ];

  it('缺省用 defaultValue', () => {
    expect(resolveApiParams(declared, {})).toEqual({ region: 'all', limit: 10 });
  });

  it('运行时同名覆盖', () => {
    expect(resolveApiParams(declared, { region: '滨江', limit: '3' })).toEqual({ region: '滨江', limit: 3 });
  });
});
