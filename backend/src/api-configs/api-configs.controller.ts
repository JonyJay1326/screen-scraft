import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ApiConfigsService } from './api-configs.service';
import { TestApiDto, UpsertApiConfigDto } from './api-configs.dto';

/** API 配置：写操作管理员；列表供绑定使用，登录即可 */
@Controller('api-configs')
export class ApiConfigsController {
  constructor(private readonly service: ApiConfigsService) {}

  /** 列表 */
  @Get()
  list() {
    return this.service.list();
  }

  /** 详情 */
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  /** 新建 */
  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: UpsertApiConfigDto) {
    return this.service.create(dto);
  }

  /** 更新 */
  @Post(':id/update')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpsertApiConfigDto) {
    return this.service.update(id, dto);
  }

  /** 删除 */
  @Post(':id/delete')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /** 试运行 */
  @Post(':id/test')
  @UseGuards(AdminGuard)
  test(@Param('id') id: string, @Body() dto: TestApiDto) {
    return this.service.test(id, dto);
  }
}
