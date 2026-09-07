import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DataService } from './data.service';

/** 运行时数据接口：GET/POST /data/:apiId */
@Controller('data')
export class DataController {
  constructor(private readonly data: DataService) {}

  /** GET 取数（参数走 query） */
  @Get(':apiId')
  getData(@Param('apiId') apiId: string, @Query() query: Record<string, unknown>): Promise<unknown> {
    return this.data.execute(apiId, query ?? {});
  }

  /** POST 取数（参数走 body） */
  @Post(':apiId')
  postData(@Param('apiId') apiId: string, @Body() body: Record<string, unknown>): Promise<unknown> {
    return this.data.execute(apiId, body ?? {});
  }
}
