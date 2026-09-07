import { describe, expect, it } from 'vitest';
import { validateCombo, validateNameValue, validateOptions, validateRadar, validateTable } from '../validators';

describe('其余协议', () => {
  it('combo 合法 / 缺 type 容忍但非法 type 拒绝', () => {
    expect(
      validateCombo({
        categories: ['1月'],
        series: [{ name: '供水量', type: 'bar', data: [1] }],
      }),
    ).toEqual([]);
    expect(
      validateCombo({
        categories: ['1月'],
        series: [{ name: '供水量', type: 'pie' as 'bar', data: [1] }],
      }).length,
    ).toBeGreaterThan(0);
    expect(validateCombo(null).length).toBeGreaterThan(0);
  });

  it('radar 合法与缺字段', () => {
    expect(
      validateRadar({
        indicators: [{ name: '水质' }],
        series: [{ name: '本月', data: [0.8] }],
      }),
    ).toEqual([]);
    expect(validateRadar({ indicators: [], series: [] }).length).toBeGreaterThan(0);
    expect(validateRadar({}).length).toBeGreaterThan(0);
  });

  it('nameValue 合法与非法', () => {
    expect(validateNameValue([{ name: '生活', value: 40 }])).toEqual([]);
    expect(validateNameValue({ name: 'x' }).length).toBeGreaterThan(0);
    expect(validateNameValue([{ name: 1, value: 'a' }]).length).toBeGreaterThan(0);
  });

  it('table 合法与非法', () => {
    expect(
      validateTable({
        columns: [{ key: 'name', label: '名称' }],
        rows: [{ name: '滨江站' }],
      }),
    ).toEqual([]);
    expect(validateTable({ columns: [], rows: [] }).length).toBeGreaterThan(0);
    expect(validateTable(null).length).toBeGreaterThan(0);
  });

  it('options 合法与非法', () => {
    expect(validateOptions([{ label: '全部', value: 'all' }])).toEqual([]);
    expect(validateOptions([])).toEqual([]);
    expect(validateOptions([{ label: 1 }]).length).toBeGreaterThan(0);
    expect(validateOptions('x').length).toBeGreaterThan(0);
  });
});
