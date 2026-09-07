import { ApiConfigDoc } from '@screencraft/shared';
import { ApiConfigDocument } from './api-config.schema';

export type ApiConfigListItem = ApiConfigDoc & { path: string; refCount: number; method: string };

/** 对外映射，永不返回明文密钥 */
export function toApiConfigDoc(row: ApiConfigDocument, refCount = 0): ApiConfigListItem {
  const method = row.type === 'sql' ? 'GET' : row.external?.method ?? 'GET';
  const path = row.type === 'sql' ? `/data/${String(row._id)}` : row.external?.url ?? '';
  return {
    _id: String(row._id),
    name: row.name,
    type: row.type,
    sql: row.sql,
    external: row.external
      ? {
          url: row.external.url,
          method: row.external.method,
          headers: row.external.headers,
          authType: row.external.authType ?? 'none',
          authSecretRef: row.authSecretEnc ? 'stored' : undefined,
        }
      : undefined,
    params: row.params ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    path,
    refCount,
    method,
  };
}
