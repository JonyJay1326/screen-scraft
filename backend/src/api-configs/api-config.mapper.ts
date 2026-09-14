import { ApiConfigDoc } from '@screencraft/shared';
import { ApiConfigDocument } from './api-config.schema';

export type ApiConfigListItem = ApiConfigDoc & { path: string; refCount: number; method: string };

/** 对外映射，永不返回明文密钥 */
export function toApiConfigDoc(row: ApiConfigDocument, refCount = 0): ApiConfigListItem {
  const method = row.type === 'external' ? row.external?.method ?? 'GET' : 'GET';
  const path = row.type === 'external' ? row.external?.url ?? '' : `/data/${String(row._id)}`;
  return {
    _id: String(row._id),
    name: row.name,
    type: row.type,
    dataProtocol: row.dataProtocol,
    sql: row.sql,
    mockKey: row.mockKey,
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
