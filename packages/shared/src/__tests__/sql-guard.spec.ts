import { describe, expect, it } from 'vitest';
import { assertReadOnlySelect, bindNamedParams } from '../sql-guard';

describe('SQL 只读校验', () => {
  it('单条 SELECT 通过', () => {
    expect(() => assertReadOnlySelect('SELECT id, name FROM t WHERE adcode = :adcode')).not.toThrow();
  });

  it('UPDATE 拒绝', () => {
    expect(() => assertReadOnlySelect('UPDATE t SET a=1')).toThrow();
  });

  it('DELETE 拒绝', () => {
    expect(() => assertReadOnlySelect('DELETE FROM t')).toThrow();
  });

  it('多语句拒绝', () => {
    expect(() => assertReadOnlySelect('SELECT 1; SELECT 2')).toThrow();
  });

  it('注释拒绝', () => {
    expect(() => assertReadOnlySelect('SELECT 1 -- ok')).toThrow();
    expect(() => assertReadOnlySelect('SELECT 1 /* x */')).toThrow();
  });

  it('命名参数绑定顺序', () => {
    const bound = bindNamedParams('SELECT * FROM t WHERE a=:a AND b=:b', { a: 1, b: 'x' });
    expect(bound.text).toContain('?');
    expect(bound.values).toEqual([1, 'x']);
  });
});
