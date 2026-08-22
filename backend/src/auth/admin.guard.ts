import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { BizException } from '../common/biz.exception';

/** 仅管理员可访问 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: { role?: string } }>();
    if (request.user?.role !== 'admin') {
      throw BizException.forbidden();
    }
    return true;
  }
}
