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
  AI_UNAVAILABLE: 4301,
  AI_OUTPUT_INVALID: 4302,
  AI_PLAN_STALE: 4303,
  AI_SCOPE_LIMIT: 4304,
  AI_REFERENCE_INVALID: 4305,
  COMPONENT_DEFINITION_INVALID: 4401,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
