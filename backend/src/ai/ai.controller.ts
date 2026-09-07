import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AiService } from './ai.service';
import { AiSettingsDto, ChatDto, UpsertKbDto } from './ai.dto';

/** AI 客服与知识库 */
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** 对话（登录即可） */
  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.ai.chat(dto);
  }

  /** 知识库列表 */
  @Get('kb-docs')
  @UseGuards(AdminGuard)
  listDocs() {
    return this.ai.listDocs();
  }

  /** 文档详情 */
  @Get('kb-docs/:id')
  @UseGuards(AdminGuard)
  getDoc(@Param('id') id: string) {
    return this.ai.getDoc(id);
  }

  /** 新建文档 */
  @Post('kb-docs')
  @UseGuards(AdminGuard)
  createDoc(@Body() dto: UpsertKbDto) {
    return this.ai.createDoc(dto);
  }

  /** 更新文档 */
  @Post('kb-docs/:id/update')
  @UseGuards(AdminGuard)
  updateDoc(@Param('id') id: string, @Body() dto: UpsertKbDto) {
    return this.ai.updateDoc(id, dto);
  }

  /** 删除文档 */
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
}
