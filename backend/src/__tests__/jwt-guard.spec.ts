import { describe, expect, it } from 'vitest';
import { extractBearerToken, isTokenFresh } from '../auth/token.util';

describe('JWT 守卫辅助逻辑', () => {
  it('改密后旧 iat 判定为失效', () => {
    const changedAt = new Date('2026-08-22T12:00:00.000Z');
    const oldIat = Math.floor(new Date('2026-08-22T11:00:00.000Z').getTime() / 1000);
    const newIat = Math.floor(new Date('2026-08-22T12:00:01.000Z').getTime() / 1000);
    expect(isTokenFresh(oldIat, changedAt)).toBe(false);
    expect(isTokenFresh(newIat, changedAt)).toBe(true);
  });

  it('解析 Bearer 头', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def');
    expect(extractBearerToken('Basic x')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });
});
