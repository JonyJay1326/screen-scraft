import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { UserDoc } from '@screencraft/shared';
import { changePasswordApi, fetchMe, loginApi } from '../api/auth';
import { clearToken, setToken } from '../api/http';

const USER_KEY = 'sc_user';

/** 读取缓存的用户 */
function readCachedUser(): UserDoc | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserDoc;
  } catch {
    return null;
  }
}

/** 登录态与当前用户 */
export const useUserStore = defineStore('user', () => {
  const user = ref<UserDoc | null>(readCachedUser());

  const isAdmin = computed(() => user.value?.role === 'admin');
  const mustChangePassword = computed(() => Boolean(user.value?.mustChangePassword));

  /** 写入用户缓存 */
  function persist(next: UserDoc | null): void {
    user.value = next;
    if (next) {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  /** 登录 */
  async function login(username: string, password: string): Promise<UserDoc> {
    const result = await loginApi(username, password);
    setToken(result.token);
    persist(result.user);
    return result.user;
  }

  /** 拉取最新资料 */
  async function hydrate(): Promise<void> {
    const me = await fetchMe();
    persist(me);
  }

  /** 改密 */
  async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const result = await changePasswordApi(oldPassword, newPassword);
    setToken(result.token);
    persist(result.user);
  }

  /** 退出 */
  function logout(): void {
    clearToken();
    persist(null);
  }

  return { user, isAdmin, mustChangePassword, login, hydrate, changePassword, logout };
});
