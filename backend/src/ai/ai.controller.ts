import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { AiService } from './ai.service';
import { AiEditorPlanDto, AiSettingsDto, AiSettingsTestDto, ChatDto, UpsertKbDto } from './ai.dto';

/** AI 智能设计配置；v0.3 客服接口仅作兼容保留 */
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** 为编辑器选中组件生成安全样式修改方案，不写大屏。 */
  @Post('editor/plan')
  createEditorPlan(@Body() dto: AiEditorPlanDto, @CurrentUser() user: RequestUser) {
    return this.ai.createEditorPlan(dto, user.id);
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
