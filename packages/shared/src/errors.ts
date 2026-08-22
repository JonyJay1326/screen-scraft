/** 业务错误码，与 docs/api.md §4 保持一致 */
export const ErrorCode = {
  OK: 0,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 4001,
  SQL_FAIL: 4101,
  PROXY_FAIL: 4102,
  PROTOCOL: 4201,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
