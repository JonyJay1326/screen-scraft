/** 判断 JWT iat 是否晚于最近一次改密 */
export function isTokenFresh(iatSeconds: number, passwordChangedAt: Date): boolean {
  return iatSeconds * 1000 >= passwordChangedAt.getTime() - 1000;
}

/** 从 Authorization 头取出 Bearer 令牌 */
export function extractBearerToken(header?: string): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}
