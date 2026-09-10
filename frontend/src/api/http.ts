import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

const TOKEN_KEY = 'sc_token';

/** 读取本地登录令牌 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** 写入登录令牌 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** 清除登录令牌 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** 强制改密期间业务接口 403 不弹重复 toast（改密弹窗已提示） */
function isForcedChangePassword(message?: string): boolean {
  if (!message?.includes('请先修改初始密码')) {
    return false;
  }
  try {
    const cached = JSON.parse(localStorage.getItem('sc_user') || 'null') as { mustChangePassword?: boolean } | null;
    return Boolean(cached?.mustChangePassword);
  } catch {
    return false;
  }
}

/** 创建仅暴露 get/post 的 Axios 单例 */
function createHttp(): AxiosInstance {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
    timeout: 15000,
  });

  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const body = response.data as { code: number; message: string; data: unknown };
      if (body.code !== 0) {
        ElMessage.error(body.message || '请求失败');
        const error = Object.assign(new Error(body.message), { code: body.code });
        return Promise.reject(error);
      }
      return body.data as never;
    },
    (error: unknown) => {
      if (axios.isCancel(error) || (error as { code?: string }).code === 'ERR_CANCELED') {
        return Promise.reject(error);
      }
      const status = (error as { response?: { status?: number; data?: { message?: string } } }).response
        ?.status;
      const serverMessage = (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message;
      if (status === 401) {
        clearToken();
        if (!location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
      if (!status) {
        ElMessage.error('无法连接服务器，请确认后端已启动');
      } else if (!isForcedChangePassword(serverMessage)) {
        ElMessage.error(serverMessage || (error as Error).message || '网络错误');
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

const http = createHttp();

/** GET 请求，返回解包后的 data */
export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return http.get(url, config) as Promise<T>;
}

/** POST 请求，返回解包后的 data */
export function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return http.post(url, data, config) as Promise<T>;
}
