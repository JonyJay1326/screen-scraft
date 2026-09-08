import { describe, expect, it } from 'vitest';
import { getBuiltinComponentMetadata } from '@screencraft/shared';
import { listMetas } from '../../../frontend/src/registry/meta-lookup';

describe('内置组件共享元数据', () => {
  it('当前 54 个模板全部可由后端读取安全字段目录', () => {
    const metas = listMetas();
    expect(metas).toHaveLength(54);
    metas.forEach((meta) => {
      const shared = getBuiltinComponentMetadata(meta.id);
      expect(shared, meta.id).toBeDefined();
      expect(shared?.dataProtocol, meta.id).toBe(meta.dataProtocol);
      expect(shared?.styleSchema, meta.id).toEqual(meta.styleSchema);
      expect(meta.styleSchema.every((field) => typeof field.aiWritable === 'boolean'), meta.id).toBe(true);
    });
  });
});
