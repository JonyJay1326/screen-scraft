import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { Project } from './projects/project.schema';
import { createBlankPage } from './screens/page.factory';
import { Screen } from './screens/screen.schema';
import { User } from './users/user.schema';

/** 幂等种子：管理员 + 演示成员 + 演示项目/大屏 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const projectModel = app.get<Model<Project>>(getModelToken(Project.name));
  const screenModel = app.get<Model<Screen>>(getModelToken(Screen.name));
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

  await seedDemoWorkspace(projectModel, screenModel, logger);
  await app.close();
}

/** 写入演示项目与大屏（按名称幂等） */
async function seedDemoWorkspace(
  projectModel: Model<Project>,
  screenModel: Model<Screen>,
  logger: Logger,
): Promise<void> {
  const existing = await projectModel.findOne({ name: '水务监控' }).exec();
  if (existing) {
    logger.log('演示项目已存在，跳过');
    return;
  }
  const water = await projectModel.create({ name: '水务监控' });
  const energy = await projectModel.create({ name: '能源看板' });
  await screenModel.create({
    projectId: String(water._id),
    name: '供水调度总览',
    category: '能源',
    deployed: true,
    fitMode: 'center',
    canvas: { width: 1920, height: 1080 },
    pages: [createBlankPage('首页')],
  });
  await screenModel.create({
    projectId: String(water._id),
    name: '管网压力监测',
    category: '工业',
    deployed: false,
    fitMode: 'center',
    canvas: { width: 1920, height: 1080 },
    pages: [createBlankPage()],
  });
  await screenModel.create({
    projectId: String(energy._id),
    name: '园区能耗',
    category: '通用',
    deployed: false,
    fitMode: 'center',
    canvas: { width: 1920, height: 1080 },
    pages: [createBlankPage()],
  });
  logger.log('演示项目已写入：水务监控、能源看板');
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
