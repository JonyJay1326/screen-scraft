import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

/** 用户集合：密码哈希不对外返回 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: ['admin', 'member'] })
  role!: 'admin' | 'member';

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ required: true, default: true })
  mustChangePassword!: boolean;

  /** JWT 签发时间需晚于此值，改密后旧令牌失效 */
  @Prop({ required: true, default: () => new Date() })
  passwordChangedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
