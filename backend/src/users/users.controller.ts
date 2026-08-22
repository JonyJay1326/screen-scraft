import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CreateUserDto, ResetPasswordDto, UserStatusDto } from './users.dto';
import { UsersService } from './users.service';

/** 用户管理接口（管理员） */
@Controller('users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 列表 */
  @Get()
  list() {
    return this.usersService.list();
  }

  /** 新建 */
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /** 重置密码 */
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.password);
  }

  /** 启用禁用 */
  @Post(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UserStatusDto) {
    return this.usersService.setStatus(id, dto.enabled);
  }
}
