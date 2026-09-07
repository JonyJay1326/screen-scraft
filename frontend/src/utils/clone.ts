/** 深拷贝可 JSON 序列化的对象，兼容 Vue 响应式代理 */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
