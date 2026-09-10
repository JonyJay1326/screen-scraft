import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ChangePasswordDto, LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

/** 认证接口 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 登录 */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  /** 当前用户 */
  @Get('me')
  me(@Req() req: Request & { user: { id: string } }) {
    return this.authService.me(req.user.id);
  }

  /** 修改密码 */
  @Post('change-password')
  changePassword(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }
}
