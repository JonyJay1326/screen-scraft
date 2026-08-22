import type { UserDoc } from '@screencraft/shared';
import { get, post } from './http';

/** 管理员：用户列表 */
export function fetchUsers(): Promise<UserDoc[]> {
  return get<UserDoc[]>('/users');
}

/** 管理员：新建用户 */
export function createUserApi(payload: {
  username: string;
  password: string;
  role: 'admin' | 'member';
}): Promise<UserDoc> {
  return post<UserDoc>('/users', payload);
}

/** 管理员：重置密码 */
export function resetPasswordApi(id: string, password: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(`/users/${id}/reset-password`, { password });
}

/** 管理员：启用/禁用 */
export function setUserStatusApi(id: string, enabled: boolean): Promise<UserDoc> {
  return post<UserDoc>(`/users/${id}/status`, { enabled });
}
