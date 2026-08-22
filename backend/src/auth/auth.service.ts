import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { UserDoc } from '@screencraft/shared';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { User } from '../users/user.schema';
import { toUserDoc } from '../users/user.mapper';

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'member';
  iat?: number;
  exp?: number;
}

/** 认证：登录、改密、签发 JWT */
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 账号密码登录 */
  async login(username: string, password: string): Promise<{ token: string; user: UserDoc }> {
    const user = await this.userModel.findOne({ username: username.trim() }).exec();
    if (!user) {
      throw BizException.validation('用户名或密码错误');
    }
    if (!user.enabled) {
      throw BizException.forbidden('账号已禁用');
    }
    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      throw BizException.validation('用户名或密码错误');
    }
    return { token: await this.signToken(user.id, user.role), user: toUserDoc(user) };
  }

  /** 读取当前用户 */
  async me(userId: string): Promise<UserDoc> {
    const user = await this.requireUser(userId);
    return toUserDoc(user);
  }

  /** 修改密码并使旧令牌失效 */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ token: string; user: UserDoc }> {
    const user = await this.requireUser(userId);
    const matched = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!matched) {
      throw BizException.validation('原密码不正确');
    }
    if (oldPassword === newPassword) {
      throw BizException.validation('新密码不能与原密码相同');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();
    return { token: await this.signToken(user.id, user.role), user: toUserDoc(user) };
  }

  /** 按 ID 取启用用户 */
  async requireUser(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw BizException.unauthorized();
    }
    if (!user.enabled) {
      throw BizException.forbidden('账号已禁用');
    }
    return user;
  }

  /** 签发 7 天 JWT */
  async signToken(userId: string, role: 'admin' | 'member'): Promise<string> {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '7d',
    });
  }
}
