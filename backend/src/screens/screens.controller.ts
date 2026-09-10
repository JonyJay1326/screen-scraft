import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { CreateScreenDto, DeployedDto, SaveScreenDto } from './screens.dto';
import { ScreensService } from './screens.service';

/** 大屏接口 */
@Controller()
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  /** 项目下列表 */
  @Get('projects/:pid/screens')
  list(@Param('pid') pid: string) {
    return this.screensService.listByProject(pid);
  }

  /** 新建空白 */
  @Post('screens')
  create(@Body() dto: CreateScreenDto) {
    return this.screensService.create(dto);
  }

  /** 详情 */
  @Get('screens/:id')
  get(@Param('id') id: string) {
    return this.screensService.getById(id);
  }

  /** 保存 */
  @Post('screens/:id/save')
  save(
    @Param('id') id: string,
    @Body() dto: SaveScreenDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.screensService.save(id, dto, user.id);
  }

  /** 删除 */
  @Post('screens/:id/delete')
  remove(@Param('id') id: string) {
    return this.screensService.remove(id);
  }

  /** 复制 */
  @Post('screens/:id/copy')
  copy(@Param('id') id: string) {
    return this.screensService.copy(id);
  }

  /** 投放标记 */
  @Post('screens/:id/deployed')
  deployed(@Param('id') id: string, @Body() dto: DeployedDto) {
    return this.screensService.setDeployed(id, dto.deployed);
  }

  /** 展示页只读取已保存版本 */
  @Get('display/:id')
  display(@Param('id') id: string) {
    return this.screensService.getById(id);
  }
}
