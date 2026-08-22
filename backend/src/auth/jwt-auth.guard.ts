import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { BizException } from '../common/biz.exception';
import { AuthService, JwtPayload } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { extractBearerToken, isTokenFresh } from './token.util';

/** 全局 JWT 守卫：校验令牌、启用状态、改密后旧票失效 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: { id: string; role: string } }>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw BizException.unauthorized();
    }
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw BizException.unauthorized();
    }
    const user = await this.authService.requireUser(payload.sub);
    if (!isTokenFresh(payload.iat ?? 0, user.passwordChangedAt)) {
      throw BizException.unauthorized('令牌已失效，请重新登录');
    }
    const path = request.path.replace(/^\/api\/v1/, '');
    const allowWhenMustChange = path === '/auth/me' || path === '/auth/change-password';
    if (user.mustChangePassword && !allowWhenMustChange) {
      throw BizException.forbidden('请先修改初始密码');
    }
    request.user = { id: user.id, role: user.role };
    return true;
  }
}
