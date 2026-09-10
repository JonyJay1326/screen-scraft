import type { UserDoc } from '@screencraft/shared';
import { get, post } from './http';

export interface LoginResult {
  token: string;
  user: UserDoc;
}

/** 登录 */
export function loginApi(username: string, password: string): Promise<LoginResult> {
  return post<LoginResult>('/auth/login', { username, password });
}

/** 当前用户 */
export function fetchMe(): Promise<UserDoc> {
  return get<UserDoc>('/auth/me');
}

/** 修改密码，返回新令牌 */
export function changePasswordApi(oldPassword: string, newPassword: string): Promise<LoginResult> {
  return post<LoginResult>('/auth/change-password', { oldPassword, newPassword });
}
