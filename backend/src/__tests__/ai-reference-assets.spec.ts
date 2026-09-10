import type { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Model } from 'mongoose';
import { afterEach, describe, expect, it } from 'vitest';
import { AiReferenceAssetsService } from '../ai/ai-reference-assets.service';
import type { AiReferenceAssetRecord } from '../ai/ai.schema';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('AI 参考图临时资源', () => {
  it('按真实文件头保存到私有目录，并阻止跨用户读取', async () => {
    const fixture = createService();
    const file = pngFile('reference.png', 'image/png', 1920, 1080);

    const asset = await fixture.service.save(file, 'owner-1');

    expect(asset).toMatchObject({ mimeType: 'image/png', width: 1920, height: 1080, size: 24 });
    await expect(fixture.service.readOwned(asset._id, 'owner-2')).rejects.toMatchObject({ bizCode: 404 });
    await expect(fixture.service.readOwned(asset._id, 'owner-1')).resolves.toMatchObject({ mimeType: 'image/png' });
    expect(asset).not.toHaveProperty('storageName');
  });

  it('拒绝扩展名、MIME、文件头不一致和超大尺寸', async () => {
    const { service } = createService();

    await expect(service.save(pngFile('reference.webp', 'image/png', 20, 20), 'owner-1'))
      .rejects.toMatchObject({ bizCode: 4001 });
    await expect(service.save(pngFile('reference.png', 'image/webp', 20, 20), 'owner-1'))
      .rejects.toMatchObject({ bizCode: 4001 });
    await expect(service.save(pngFile('reference.png', 'image/png', 8193, 20), 'owner-1'))
      .rejects.toMatchObject({ bizCode: 4001 });
  });

  it('主动删除与 TTL 清理都同时移除文件和元数据', async () => {
    const fixture = createService();
    const first = await fixture.service.save(pngFile('first.png', 'image/png', 20, 20), 'owner-1');
    const firstRow = fixture.rows[0];
    const firstPath = join(fixture.directory, firstRow.storageName);

    await fixture.service.removeOwned(first._id, 'owner-1');

    await expect(access(firstPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(fixture.rows).toHaveLength(0);

    await fixture.service.save(pngFile('second.png', 'image/png', 20, 20), 'owner-1');
    const secondPath = join(fixture.directory, fixture.rows[0].storageName);
    fixture.rows[0].expiresAt = new Date(Date.now() - 1000);

    await expect(fixture.service.cleanupExpired()).resolves.toBe(1);
    await expect(access(secondPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(fixture.rows).toHaveLength(0);
  });
});

function createService() {
  const directory = join(tmpdir(), `screencraft-ai-reference-${randomUUID()}`);
  temporaryDirectories.push(directory);
  const rows: Array<AiReferenceAssetRecord & { _id: string }> = [];
  const model = {
    create: async (data: Omit<AiReferenceAssetRecord, '_id'>) => {
      const row = { ...data, _id: randomUUID() } as AiReferenceAssetRecord & { _id: string };
      rows.push(row);
      return row;
    },
    findOne: (query: { _id: string; ownerId: string }) => ({
      exec: async () => rows.find((row) => row._id === query._id && row.ownerId === query.ownerId) ?? null,
    }),
    find: ({ expiresAt }: { expiresAt: { $lte: Date } }) => ({
      exec: async () => rows.filter((row) => row.expiresAt <= expiresAt.$lte),
    }),
    deleteOne: ({ _id }: { _id: string }) => ({
      exec: async () => {
        const index = rows.findIndex((row) => row._id === String(_id));
        if (index >= 0) {
          rows.splice(index, 1);
        }
      },
    }),
  } as unknown as Model<AiReferenceAssetRecord>;
  const config = {
    get: (key: string) => key === 'AI_REFERENCE_DIR' ? directory : undefined,
  } as unknown as ConfigService;
  return { directory, rows, service: new AiReferenceAssetsService(model, config) };
}

function pngFile(originalname: string, mimetype: string, width: number, height: number) {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return { originalname, mimetype, buffer, size: buffer.length };
}
