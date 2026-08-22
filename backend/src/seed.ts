import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { User } from './users/user.schema';

/** 幂等种子：管理员 + 演示成员（已存在则跳过） */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const logger = new Logger('Seed');

  const adminName = config.get<string>('SEED_ADMIN_USERNAME') ?? 'admin';
  const adminPass = config.get<string>('SEED_ADMIN_PASSWORD') ?? 'ScreenCraft@2026';
  await upsertUser(userModel, {
    username: adminName,
    password: adminPass,
    role: 'admin',
    mustChangePassword: true,
  });
  logger.log(`管理员已就绪：${adminName}（首次登录强制改密）`);

  await upsertUser(userModel, {
    username: 'demo',
    password: 'Demo@2026',
    role: 'member',
    mustChangePassword: false,
  });
  logger.log('演示成员已就绪：demo / Demo@2026');

  await app.close();
}

/** 按用户名插入，已存在则不覆盖密码 */
async function upsertUser(
  userModel: Model<User>,
  input: { username: string; password: string; role: 'admin' | 'member'; mustChangePassword: boolean },
): Promise<void> {
  const exists = await userModel.findOne({ username: input.username }).exec();
  if (exists) {
    return;
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  await userModel.create({
    username: input.username,
    passwordHash,
    role: input.role,
    enabled: true,
    mustChangePassword: input.mustChangePassword,
    passwordChangedAt: new Date(0),
  });
}

void bootstrap();
