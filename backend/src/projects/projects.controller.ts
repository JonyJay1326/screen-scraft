import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

/** 项目接口 */
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** 列表 */
  @Get()
  list() {
    return this.projectsService.list();
  }

  /** 新建 */
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto.name);
  }

  /** 重命名 */
  @Post(':id/update')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto.name);
  }

  /** 删除 */
  @Post(':id/delete')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
