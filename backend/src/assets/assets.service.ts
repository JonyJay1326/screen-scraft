import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BizException } from '../common/biz.exception';

const ALLOW_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.ogg']);

/** 资源上传 */
@Injectable()
export class AssetsService {
  constructor(private readonly config: ConfigService) {}

  /** 校验并落盘，返回可访问 URL */
  async save(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }): Promise<{ url: string }> {
    if (!file) {
      throw BizException.validation('请选择文件');
    }
    if (file.size > 200 * 1024 * 1024) {
      throw BizException.validation('单文件不能超过 200MB');
    }
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOW_EXT.has(ext) && !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      throw BizException.validation('仅支持图片或视频');
    }
    const dir = this.config.get<string>('UPLOAD_DIR') || './uploads';
    await mkdir(dir, { recursive: true });
    const name = `${randomBytes(16).toString('hex')}${ext || '.bin'}`;
    await writeFile(join(dir, name), file.buffer);
    return { url: `/uploads/${name}` };
  }
}
