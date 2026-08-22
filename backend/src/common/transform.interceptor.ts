import { ErrorCode } from '@screencraft/shared';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/** 成功响应包装为 { code: 0, message: 'ok', data } */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => ({
        code: ErrorCode.OK,
        message: 'ok',
        data: data ?? null,
      })),
    );
  }
}
