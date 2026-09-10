import { UserDoc } from '@screencraft/shared';
import { User, UserDocument } from '../users/user.schema';

/** 把用户文档转成对外 UserDoc（不含密码） */
export function toUserDoc(user: UserDocument | (User & { _id: { toString(): string }; createdAt: Date; updatedAt: Date })): UserDoc {
  return {
    _id: String(user._id),
    username: user.username,
    role: user.role,
    enabled: user.enabled,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
