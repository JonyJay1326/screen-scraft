import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AssetsService } from './assets.service';

/** 资源上传 */
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  /** 上传图片/视频 */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer; size: number }) {
    return this.assets.save(file);
  }
}
