import { describe, expect, it } from 'vitest';
import { validateAxis } from '../validators';

describe('axis 协议', () => {
  it('合法样例通过', () => {
    const issues = validateAxis({
      categories: ['1月', '2月'],
      series: [{ name: '供水量', data: [1, 2] }],
    });
    expect(issues).toEqual([]);
  });

  it('类型错误被拒绝', () => {
    expect(validateAxis({ categories: [1], series: [] }).length).toBeGreaterThan(0);
  });

  it('缺字段被拒绝', () => {
    expect(validateAxis({ categories: ['a'] }).length).toBeGreaterThan(0);
  });
});
