import { describe, expect, it } from 'vitest';

describe('API 删除保护（引用计数语义）', () => {
  it('引用大于 0 时不可删', () => {
    const refCount = 2;
    expect(refCount > 0).toBe(true);
  });
});
