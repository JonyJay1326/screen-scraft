import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { AiReferenceAsset } from '@screencraft/shared';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { AiReferenceAssetRecord } from './ai.schema';
import { extensionMatchesImage, inspectSupportedImage, type SupportedImageMime } from './image-metadata';

const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_REFERENCE_SIDE = 8192;
const DEFAULT_TTL_HOURS = 24;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export interface ReferenceImageContent {
  mimeType: SupportedImageMime;
  buffer: Buffer;
  width: number;
  height: number;
}

interface UploadedReferenceFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

/** AI 参考图独立存储；不暴露 URL，并按 ownerId 隔离。 */
@Injectable()
export class AiReferenceAssetsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiReferenceAssetsService.name);
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectModel(AiReferenceAssetRecord.name)
    private readonly assetModel: Model<AiReferenceAssetRecord>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.cleanupExpired();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpired().catch((error: unknown) => {
        this.logger.error(`AI 参考图定时清理失败：${formatError(error)}`);
      });
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  async save(file: UploadedReferenceFile | undefined, ownerId: string): Promise<AiReferenceAsset> {
    if (!file?.buffer?.length) {
      throw BizException.validation('请选择参考图');
    }
    if (file.size > MAX_REFERENCE_BYTES || file.buffer.length > MAX_REFERENCE_BYTES) {
      throw BizException.validation('参考图不能超过 10MB');
    }
    const metadata = inspectSupportedImage(file.buffer);
    if (!metadata) {
      throw BizException.validation('仅支持有效的 PNG、JPEG 或 WebP 图片');
    }
    if (file.mimetype.toLowerCase() !== metadata.mimeType || !extensionMatchesImage(file.originalname, metadata)) {
      throw BizException.validation('参考图扩展名、MIME 与真实文件类型不一致');
    }
    if (metadata.width > MAX_REFERENCE_SIDE || metadata.height > MAX_REFERENCE_SIDE) {
      throw BizException.validation('参考图单边不能超过 8192px');
    }

    const storageName = `${randomUUID()}${metadata.extension}`;
    const storagePath = this.resolveStoragePath(storageName);
    await mkdir(this.storageDirectory(), { recursive: true });
    await writeFile(storagePath, file.buffer, { flag: 'wx' });
    const expiresAt = new Date(Date.now() + this.ttlHours() * 60 * 60 * 1000);
    try {
      const row = await this.assetModel.create({
        ownerId,
        storageName,
        mimeType: metadata.mimeType,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        expiresAt,
      });
      return toReferenceAsset(row);
    } catch (error) {
      await unlinkIfExists(storagePath);
      throw error;
    }
  }

  async readOwned(id: string, ownerId: string): Promise<ReferenceImageContent> {
    const row = await this.assetModel.findOne({ _id: id, ownerId }).exec().catch(() => null);
    if (!row) {
      throw BizException.notFound('参考图不存在或无权访问');
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      await this.removeRecord(row);
      throw BizException.notFound('参考图已过期，请重新上传');
    }
    try {
      return {
        mimeType: row.mimeType,
        buffer: await readFile(this.resolveStoragePath(row.storageName)),
        width: row.width,
        height: row.height,
      };
    } catch (error) {
      if (isFileMissing(error)) {
        await this.assetModel.deleteOne({ _id: row._id }).exec();
        throw BizException.notFound('参考图文件已失效，请重新上传');
      }
      throw error;
    }
  }

  async removeOwned(id: string, ownerId: string): Promise<{ ok: true }> {
    const row = await this.assetModel.findOne({ _id: id, ownerId }).exec().catch(() => null);
    if (!row) {
      throw BizException.notFound('参考图不存在或无权访问');
    }
    await this.removeRecord(row);
    return { ok: true };
  }

  /** 应用层 TTL：先删私有文件，再删元数据，避免 Mongo TTL 先删记录后遗留文件。 */
  async cleanupExpired(now = new Date()): Promise<number> {
    const rows = await this.assetModel.find({ expiresAt: { $lte: now } }).exec();
    let removed = 0;
    for (const row of rows) {
      try {
        await this.removeRecord(row);
        removed += 1;
      } catch (error) {
        this.logger.error(`AI 参考图 ${String(row._id)} 清理失败：${formatError(error)}`);
      }
    }
    return removed;
  }

  private async removeRecord(row: AiReferenceAssetRecord & { _id: unknown }): Promise<void> {
    await unlinkIfExists(this.resolveStoragePath(row.storageName));
    await this.assetModel.deleteOne({ _id: row._id }).exec();
  }

  private storageDirectory(): string {
    return resolve(process.cwd(), this.config.get<string>('AI_REFERENCE_DIR') || './ai-reference-assets');
  }

  private resolveStoragePath(storageName: string): string {
    if (!/^[0-9a-f-]{36}\.(?:png|jpg|webp)$/.test(storageName)) {
      throw BizException.validation('参考图存储标识不合法');
    }
    const directory = this.storageDirectory();
    const path = resolve(directory, storageName);
    if (!path.startsWith(`${directory}${sep}`)) {
      throw BizException.validation('参考图存储路径不合法');
    }
    return path;
  }

  private ttlHours(): number {
    const configured = Number(this.config.get<string>('AI_REFERENCE_TTL_HOURS') || DEFAULT_TTL_HOURS);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_HOURS;
  }
}

async function unlinkIfExists(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (!isFileMissing(error)) {
      throw error;
    }
  }
}

function isFileMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toReferenceAsset(row: AiReferenceAssetRecord & { _id: unknown }): AiReferenceAsset {
  return {
    _id: String(row._id),
    mimeType: row.mimeType,
    size: row.size,
    width: row.width,
    height: row.height,
    expiresAt: row.expiresAt.toISOString(),
  };
}
