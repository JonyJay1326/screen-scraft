import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { BizException } from '../common/biz.exception';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { AiBorderAssetsService } from './ai-border-assets.service';
import { AiReferenceAssetsService } from './ai-reference-assets.service';
import { AiService } from './ai.service';
import {
  AiEditorPlanDto,
  AiGenerateComponentDto,
  AiSettingsDto,
  AiSettingsTestDto,
  ChatDto,
  UpsertKbDto,
} from './ai.dto';

/** AI 智能设计配置；v0.3 客服接口仅作兼容保留 */
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly referenceAssets: AiReferenceAssetsService,
    private readonly borderAssets: AiBorderAssetsService,
  ) {}

  /** 编辑器只读能力，不暴露模型配置或密钥。 */
  @Get('editor/capabilities')
  getEditorCapabilities() {
    return this.ai.getEditorCapabilities();
  }

  /** 上传本人临时参考图；文件不进入公开资源目录。 */
  @Post('editor/reference-assets')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadReferenceAsset(
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer; size: number } | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    const capabilities = await this.ai.getEditorCapabilities();
    if (!capabilities.visionEnabled) {
      throw BizException.aiUnavailable(capabilities.visionUnavailableReason || 'DeepSeek 视觉能力不可用');
    }
    return this.referenceAssets.save(file, user.id);
  }

  /** 主动清理本人临时参考图。 */
  @Post('editor/reference-assets/:id/delete')
  deleteReferenceAsset(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.referenceAssets.removeOwned(id, user.id);
  }

  /** 上传永久九宫格边框图。 */
  @Post('editor/border-assets')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadBorderAsset(
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer; size: number } | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.borderAssets.save(file, user.id);
  }

  /** 删除本人永久边框资产。 */
  @Post('editor/border-assets/:id/delete')
  deleteBorderAsset(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.borderAssets.removeOwned(id, user.id);
  }

  /** 为编辑器生成安全样式修改方案，不写大屏。 */
  @Post('editor/plan')
  createEditorPlan(
    @Body() dto: AiEditorPlanDto,
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
  ) {
    const controller = new AbortController();
    const response = request.res;
    const abortOnDisconnect = () => {
      if (!response?.writableEnded) {
        controller.abort();
      }
    };
    response?.once('close', abortOnDisconnect);
    return this.ai.createEditorPlan(dto, user.id, controller.signal).finally(() => {
      response?.off('close', abortOnDisconnect);
    });
  }

  /** 生成安全声明式图表定义，不直接写大屏。 */
  @Post('editor/generate-component')
  generateComponent(
    @Body() dto: AiGenerateComponentDto,
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
  ) {
    const controller = new AbortController();
    const response = request.res;
    const abortOnDisconnect = () => {
      if (!response?.writableEnded) {
        controller.abort();
      }
    };
    response?.once('close', abortOnDisconnect);
    return this.ai.generateComponent(dto, user.id, controller.signal).finally(() => {
      response?.off('close', abortOnDisconnect);
    });
  }

  /** @deprecated v0.4 前端停止新调用 */
  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.ai.chat(dto);
  }

  /** @deprecated v0.4 前端停止新调用 */
  @Get('kb-docs')
  @UseGuards(AdminGuard)
  listDocs() {
    return this.ai.listDocs();
  }

  /** @deprecated v0.4 前端停止新调用 */
  @Get('kb-docs/:id')
  @UseGuards(AdminGuard)
  getDoc(@Param('id') id: string) {
    return this.ai.getDoc(id);
  }

  /** @deprecated v0.4 前端停止新调用 */
  @Post('kb-docs')
  @UseGuards(AdminGuard)
  createDoc(@Body() dto: UpsertKbDto) {
    return this.ai.createDoc(dto);
  }

  /** @deprecated v0.4 前端停止新调用 */
  @Post('kb-docs/:id/update')
  @UseGuards(AdminGuard)
  updateDoc(@Param('id') id: string, @Body() dto: UpsertKbDto) {
    return this.ai.updateDoc(id, dto);
  }

  /** @deprecated v0.4 前端停止新调用 */
  @Post('kb-docs/:id/delete')
  @UseGuards(AdminGuard)
  removeDoc(@Param('id') id: string) {
    return this.ai.removeDoc(id);
  }

  /** 读取模型配置 */
  @Get('settings')
  @UseGuards(AdminGuard)
  getSettings() {
    return this.ai.getSettings();
  }

  /** 保存模型配置 */
  @Post('settings')
  @UseGuards(AdminGuard)
  saveSettings(@Body() dto: AiSettingsDto) {
    return this.ai.saveSettings(dto);
  }

  /** 分别测试文本 JSON 与视觉输入能力 */
  @Post('settings/test')
  @UseGuards(AdminGuard)
  testSettings(@Body() dto: AiSettingsTestDto) {
    return this.ai.testSettings(dto);
  }
}
