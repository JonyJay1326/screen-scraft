import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { AiBorderAsset } from '@screencraft/shared';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import type { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { AiBorderAssetRecord } from './ai.schema';
import { extensionMatchesImage, inspectSupportedImage } from './image-metadata';

const MAX_BORDER_BYTES = 10 * 1024 * 1024;
const MAX_BORDER_SIDE = 8192;

interface UploadedBorderFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

/** 永久九宫格边框图；公开 url 随机文件名，业务以 assetId + ownerId 鉴权。 */
@Injectable()
export class AiBorderAssetsService {
  constructor(
    @InjectModel(AiBorderAssetRecord.name)
    private readonly assetModel: Model<AiBorderAssetRecord>,
    private readonly config: ConfigService,
  ) {}

  /** 上传永久边框图，仅 PNG/WebP。 */
  async save(file: UploadedBorderFile | undefined, ownerId: string): Promise<AiBorderAsset> {
    const prepared = this.validateFile(file);
    return this.persist(prepared.buffer, prepared.metadata, ownerId, prepared.size);
  }

  /** 从已校验的参考图缓冲转存为永久边框资产。 */
  async saveFromBuffer(
    buffer: Buffer,
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
    ownerId: string,
  ): Promise<AiBorderAsset> {
    if (mimeType === 'image/jpeg') {
      throw BizException.validation('九宫格边框仅支持透明 PNG 或 WebP，请更换参考图');
    }
    const metadata = inspectSupportedImage(buffer);
    if (!metadata || (metadata.mimeType !== 'image/png' && metadata.mimeType !== 'image/webp')) {
      throw BizException.validation('九宫格边框仅支持有效的 PNG 或 WebP 图片');
    }
    if (metadata.width > MAX_BORDER_SIDE || metadata.height > MAX_BORDER_SIDE) {
      throw BizException.validation('边框图单边不能超过 8192px');
    }
    if (buffer.length > MAX_BORDER_BYTES) {
      throw BizException.validation('边框图不能超过 10MB');
    }
    return this.persist(buffer, metadata, ownerId, buffer.length);
  }

  /** 校验归属并返回资产视图。 */
  async requireOwned(id: string, ownerId: string): Promise<AiBorderAsset> {
    const row = await this.assetModel.findOne({ _id: id, ownerId }).exec().catch(() => null);
    if (!row) {
      throw BizException.notFound('边框资产不存在或无权访问');
    }
    return toBorderAsset(row);
  }

  /** 校验资产是否存在且归属指定用户。 */
  async assertOwnedIds(ids: string[], ownerId: string): Promise<void> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) {
      return;
    }
    const rows = await this.assetModel.find({ _id: { $in: unique }, ownerId }).select('_id').exec();
    if (rows.length !== unique.length) {
      throw BizException.forbidden('存在未登记或越权的边框资产');
    }
  }

  /** 删除本人永久边框资产；不扫描大屏。 */
  async removeOwned(id: string, ownerId: string): Promise<{ ok: true }> {
    const row = await this.assetModel.findOne({ _id: id, ownerId }).exec().catch(() => null);
    if (!row) {
      throw BizException.notFound('边框资产不存在或无权访问');
    }
    await this.assetModel.deleteOne({ _id: row._id }).exec();
    await unlinkIfExists(this.resolveStoragePath(row.storageName));
    return { ok: true };
  }

  private validateFile(file: UploadedBorderFile | undefined): {
    buffer: Buffer;
    size: number;
    metadata: NonNullable<ReturnType<typeof inspectSupportedImage>>;
  } {
    if (!file?.buffer?.length) {
      throw BizException.validation('请选择边框图');
    }
    if (file.size > MAX_BORDER_BYTES || file.buffer.length > MAX_BORDER_BYTES) {
      throw BizException.validation('边框图不能超过 10MB');
    }
    const metadata = inspectSupportedImage(file.buffer);
    if (!metadata || (metadata.mimeType !== 'image/png' && metadata.mimeType !== 'image/webp')) {
      throw BizException.validation('仅支持有效的 PNG 或 WebP 图片');
    }
    if (file.mimetype.toLowerCase() !== metadata.mimeType || !extensionMatchesImage(file.originalname, metadata)) {
      throw BizException.validation('边框图扩展名、MIME 与真实文件类型不一致');
    }
    if (metadata.width > MAX_BORDER_SIDE || metadata.height > MAX_BORDER_SIDE) {
      throw BizException.validation('边框图单边不能超过 8192px');
    }
    return { buffer: file.buffer, size: file.size, metadata };
  }

  private async persist(
    buffer: Buffer,
    metadata: NonNullable<ReturnType<typeof inspectSupportedImage>>,
    ownerId: string,
    size: number,
  ): Promise<AiBorderAsset> {
    const storageName = `${randomUUID()}${metadata.extension}`;
    const storagePath = this.resolveStoragePath(storageName);
    await mkdir(this.storageDirectory(), { recursive: true });
    await writeFile(storagePath, buffer, { flag: 'wx' });
    const url = `/uploads/border-assets/${storageName}`;
    try {
      const row = await this.assetModel.create({
        ownerId,
        storageName,
        mimeType: metadata.mimeType,
        size,
        width: metadata.width,
        height: metadata.height,
        url,
      });
      return toBorderAsset(row);
    } catch (error) {
      await unlinkIfExists(storagePath);
      throw error;
    }
  }

  private storageDirectory(): string {
    const root = this.config.get<string>('UPLOAD_DIR') || './uploads';
    return resolve(process.cwd(), root, 'border-assets');
  }

  private resolveStoragePath(storageName: string): string {
    const directory = this.storageDirectory();
    const full = resolve(directory, storageName);
    if (!full.startsWith(directory + sep) && full !== directory) {
      throw BizException.validation('非法边框资产路径');
    }
    return full;
  }
}

function toBorderAsset(row: AiBorderAssetRecord & { _id: unknown }): AiBorderAsset {
  return {
    _id: String(row._id),
    mimeType: row.mimeType,
    size: row.size,
    width: row.width,
    height: row.height,
    url: row.url,
  };
}

async function unlinkIfExists(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    /* 文件可能已不存在 */
  }
}
