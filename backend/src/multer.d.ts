/** multer 运行时由 Nest 传递依赖提供，此处仅补类型 */
declare module 'multer' {
  export function memoryStorage(): unknown;
}
