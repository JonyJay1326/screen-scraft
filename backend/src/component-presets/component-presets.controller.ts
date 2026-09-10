import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { CreateComponentPresetDto, UpdateComponentPresetDto } from './component-presets.dto';
import { ComponentPresetsService } from './component-presets.service';

@Controller('component-presets')
export class ComponentPresetsController {
  constructor(private readonly presets: ComponentPresetsService) {}

  @Get()
  list(
    @Query('scope') scope: 'personal' | 'public' = 'personal',
    @Query('category') category: 'chart' | 'decoration' | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.presets.list(
      scope === 'public' ? 'public' : 'personal',
      user.id,
      category === 'chart' || category === 'decoration' ? category : undefined,
    );
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.presets.getById(id, user.id, user.role === 'admin');
  }

  @Post()
  create(@Body() dto: CreateComponentPresetDto, @CurrentUser() user: RequestUser) {
    return this.presets.create(dto, user.id);
  }

  @Post(':id/update')
  update(@Param('id') id: string, @Body() dto: UpdateComponentPresetDto, @CurrentUser() user: RequestUser) {
    return this.presets.update(id, dto, user.id);
  }

  @Post(':id/copy')
  copy(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.presets.copy(id, user.id);
  }

  @Post(':id/delete')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.presets.remove(id, user.id);
  }

  @Post(':id/promote')
  @UseGuards(AdminGuard)
  promote(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.presets.promote(id, user.id);
  }
}
