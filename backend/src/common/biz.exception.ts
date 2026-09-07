import { ErrorCode } from '@screencraft/shared';
import { HttpException, HttpStatus } from '@nestjs/common';

/** 携带业务错误码的 HTTP 异常 */
export class BizException extends HttpException {
  readonly bizCode: number;

  constructor(code: number, message: string, httpStatus: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ code, message }, httpStatus);
    this.bizCode = code;
  }

  /** 参数校验 / 版本冲突 */
  static validation(message: string): BizException {
    return new BizException(ErrorCode.VALIDATION, message, HttpStatus.BAD_REQUEST);
  }

  /** 未登录或令牌失效 */
  static unauthorized(message = '未登录或令牌失效'): BizException {
    return new BizException(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }

  /** 无权限 */
  static forbidden(message = '无权限'): BizException {
    return new BizException(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }

  /** 资源不存在 */
  static notFound(message = '资源不存在'): BizException {
    return new BizException(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }

  /** SQL 只读校验或执行失败 */
  static sqlFail(message: string): BizException {
    return new BizException(ErrorCode.SQL_FAIL, message, HttpStatus.BAD_REQUEST);
  }

  /** 外部代理 / SSRF / 天气代理失败 */
  static proxyFail(message: string): BizException {
    return new BizException(ErrorCode.PROXY_FAIL, message, HttpStatus.BAD_REQUEST);
  }

  /** 数据不符合组件协议 */
  static protocol(message: string): BizException {
    return new BizException(ErrorCode.PROTOCOL, message, HttpStatus.BAD_REQUEST);
  }
}
