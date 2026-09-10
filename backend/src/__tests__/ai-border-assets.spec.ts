import type { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Model } from 'mongoose';
import { afterEach, describe, expect, it } from 'vitest';
import { AiBorderAssetsService } from '../ai/ai-border-assets.service';
import type { AiBorderAssetRecord } from '../ai/ai.schema';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('AI 永久边框资产', () => {
  it('保存 PNG 并拒绝跨用户访问与 JPEG', async () => {
    const fixture = createService();
    const file = pngFile('border.png', 'image/png', 120, 80);

    const asset = await fixture.service.save(file, 'owner-1');

    expect(asset).toMatchObject({
      mimeType: 'image/png',
      width: 120,
      height: 80,
      url: expect.stringMatching(/^\/uploads\/border-assets\//),
    });
    await expect(fixture.service.requireOwned(asset._id, 'owner-2')).rejects.toMatchObject({ bizCode: 404 });
    await expect(fixture.service.requireOwned(asset._id, 'owner-1')).resolves.toMatchObject({ _id: asset._id });
    await expect(fixture.service.saveFromBuffer(file.buffer, 'image/jpeg', 'owner-1'))
      .rejects.toMatchObject({ bizCode: 4001 });
  });

  it('assertOwnedIds 拒绝未登记与越权资产', async () => {
    const fixture = createService();
    const asset = await fixture.service.save(pngFile('ok.png', 'image/png', 32, 32), 'owner-1');

    await expect(fixture.service.assertOwnedIds([asset._id], 'owner-1')).resolves.toBeUndefined();
    await expect(fixture.service.assertOwnedIds([asset._id, 'missing-id'], 'owner-1'))
      .rejects.toMatchObject({ bizCode: 403 });
    await expect(fixture.service.assertOwnedIds([asset._id], 'owner-2'))
      .rejects.toMatchObject({ bizCode: 403 });
  });

  it('删除本人资产会移除文件，不要求扫描大屏', async () => {
    const fixture = createService();
    const asset = await fixture.service.save(pngFile('del.png', 'image/png', 40, 40), 'owner-1');
    const storagePath = join(fixture.uploadRoot, 'border-assets', fixture.rows[0].storageName);

    await fixture.service.removeOwned(asset._id, 'owner-1');

    await expect(access(storagePath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(fixture.rows).toHaveLength(0);
  });
});

function createService() {
  const uploadRoot = join(tmpdir(), `screencraft-ai-border-root-${randomUUID()}`);
  temporaryDirectories.push(uploadRoot);
  const rows: Array<AiBorderAssetRecord & { _id: string }> = [];
  const model = {
    create: async (data: Omit<AiBorderAssetRecord, '_id'>) => {
      const row = { ...data, _id: randomUUID() } as AiBorderAssetRecord & { _id: string };
      rows.push(row);
      return row;
    },
    findOne: (query: { _id: string; ownerId: string }) => ({
      exec: async () => rows.find((row) => row._id === query._id && row.ownerId === query.ownerId) ?? null,
    }),
    find: (query: { _id: { $in: string[] }; ownerId: string }) => ({
      select: () => ({
        exec: async () => rows
          .filter((row) => query._id.$in.includes(row._id) && row.ownerId === query.ownerId)
          .map((row) => ({ _id: row._id })),
      }),
    }),
    deleteOne: ({ _id }: { _id: string }) => ({
      exec: async () => {
        const index = rows.findIndex((row) => row._id === String(_id));
        if (index >= 0) {
          rows.splice(index, 1);
        }
      },
    }),
  } as unknown as Model<AiBorderAssetRecord>;
  const config = {
    get: (key: string) => (key === 'UPLOAD_DIR' ? uploadRoot : undefined),
  } as unknown as ConfigService;
  return {
    uploadRoot,
    rows,
    service: new AiBorderAssetsService(model, config),
  };
}

function pngFile(originalname: string, mimetype: string, width: number, height: number) {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return { originalname, mimetype, buffer, size: buffer.length };
}
