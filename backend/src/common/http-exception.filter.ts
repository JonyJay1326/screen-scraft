import { ErrorCode } from '@screencraft/shared';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/** 将异常统一转换为 { code, message, data } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const mapped = this.mapException(exception);
    response.status(mapped.httpStatus).json({
      code: mapped.code,
      message: mapped.message,
      data: null,
    });
  }

  /** 把未知异常映射为业务码 */
  private mapException(exception: unknown): { code: number; message: string; httpStatus: number } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body && 'message' in body) {
        const payload = body as { code: number; message: string };
        return { code: payload.code, message: payload.message, httpStatus: status };
      }
      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body !== null && 'message' in body
            ? String((body as { message: unknown }).message)
            : exception.message;
      const code =
        status === HttpStatus.UNAUTHORIZED
          ? ErrorCode.UNAUTHORIZED
          : status === HttpStatus.FORBIDDEN
            ? ErrorCode.FORBIDDEN
            : status === HttpStatus.NOT_FOUND
              ? ErrorCode.NOT_FOUND
              : ErrorCode.VALIDATION;
      return { code, message, httpStatus: status };
    }
    this.logger.error(exception);
    return {
      code: ErrorCode.VALIDATION,
      message: '服务器内部错误',
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}
