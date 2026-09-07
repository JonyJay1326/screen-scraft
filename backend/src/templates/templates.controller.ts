import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import type { Request } from 'express';
import { Category } from '@screencraft/shared';
import { AdminGuard } from '../auth/admin.guard';
import { TemplatesService } from './templates.service';

class SaveAsTemplateDto {
  @IsString()
  name!: string;

  @IsIn(['通用', '工业', '政务', '医疗', '交通', '能源'])
  category!: Category;
}

class CreateFromTemplateDto {
  @IsString()
  projectId!: string;
}

/** 模板接口 */
@Controller()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /** 模板列表 */
  @Get('templates')
  list(
    @Query('scope') scope: 'public' | 'personal' = 'personal',
    @Query('category') category: string | undefined,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.templatesService.list(scope === 'public' ? 'public' : 'personal', req.user.id, category);
  }

  /** 模板详情（含预览快照） */
  @Get('templates/:id')
  detail(@Param('id') id: string, @Req() req: Request & { user: { id: string; role: string } }) {
    return this.templatesService.getById(id, req.user.id, req.user.role === 'admin');
  }

  /** 另存为个人模板 */
  @Post('screens/:id/save-as-template')
  saveAs(
    @Param('id') id: string,
    @Body() dto: SaveAsTemplateDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.templatesService.saveAsTemplate(id, req.user.id, dto.name, dto.category);
  }

  /** 以此模板新建大屏 */
  @Post('templates/:id/create-screen')
  createScreen(@Param('id') id: string, @Body() dto: CreateFromTemplateDto) {
    return this.templatesService.createScreen(id, dto.projectId);
  }

  /** 删除个人模板 */
  @Post('templates/:id/delete')
  remove(@Param('id') id: string, @Req() req: Request & { user: { id: string; role: string } }) {
    return this.templatesService.remove(id, req.user.id, req.user.role === 'admin');
  }

  /** 提升公共模板 */
  @Post('templates/:id/promote')
  @UseGuards(AdminGuard)
  promote(@Param('id') id: string) {
    return this.templatesService.promote(id);
  }
}
