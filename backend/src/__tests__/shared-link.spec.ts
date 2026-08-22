import { ErrorCode } from '@screencraft/shared';
import { describe, expect, it } from 'vitest';

describe('shared 引用链路', () => {
  it('后端能读到契约错误码', () => {
    expect(ErrorCode.OK).toBe(0);
    expect(ErrorCode.UNAUTHORIZED).toBe(401);
  });
});
