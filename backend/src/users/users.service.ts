import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserDoc } from '@screencraft/shared';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { User } from './user.schema';
import { toUserDoc } from './user.mapper';

/** 用户管理（管理员） */
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  /** 用户列表 */
  async list(): Promise<UserDoc[]> {
    const rows = await this.userModel.find().sort({ createdAt: 1 }).exec();
    return rows.map((row) => toUserDoc(row));
  }

  /** 新建用户，首次登录强制改密 */
  async create(input: { username: string; password: string; role: 'admin' | 'member' }): Promise<UserDoc> {
    const username = input.username.trim();
    const exists = await this.userModel.findOne({ username }).exec();
    if (exists) {
      throw BizException.validation('用户名已存在');
    }
    const doc = await this.userModel.create({
      username,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      enabled: true,
      mustChangePassword: true,
      passwordChangedAt: new Date(0),
    });
    return toUserDoc(doc);
  }

  /** 重置密码并强制下次改密 */
  async resetPassword(id: string, password: string): Promise<{ ok: true }> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw BizException.notFound('用户不存在');
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    user.mustChangePassword = true;
    user.passwordChangedAt = new Date();
    await user.save();
    return { ok: true };
  }

  /** 启用 / 禁用 */
  async setStatus(id: string, enabled: boolean): Promise<UserDoc> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw BizException.notFound('用户不存在');
    }
    user.enabled = enabled;
    await user.save();
    return toUserDoc(user);
  }
}
