import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../auth/public.decorator';

/** 健康检查：确认服务与 Mongo 连接 */
@Public()
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /** 返回探活结果 */
  @Get()
  check(): { ok: true; mongo: string } {
    return { ok: true, mongo: this.connection.readyState === 1 ? 'connected' : 'disconnected' };
  }
}
