import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../errors';

describe('ErrorCode', () => {
  it('成功码为 0', () => {
    expect(ErrorCode.OK).toBe(0);
  });

  it('校验失败码为 4001', () => {
    expect(ErrorCode.VALIDATION).toBe(4001);
  });
});
