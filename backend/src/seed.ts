import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { KbDoc } from './ai/ai.schema';
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
  await seedManual(app.get<Model<KbDoc>>(getModelToken(KbDoc.name)), logger);
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

/** 写入操作手册知识库（幂等） */
async function seedManual(kbModel: Model<KbDoc>, logger: Logger): Promise<void> {
  const title = 'ScreenCraft 操作手册';
  const exists = await kbModel.findOne({ title }).exec();
  if (exists) {
    logger.log('知识库手册已存在，跳过');
    return;
  }
  const content = `# ScreenCraft 操作手册

## 如何添加图表组件
在编辑器左侧打开「组件」面板，选择图表分类，点击「折线图·样式1」即可添加到画布中央。也可把组件卡片拖到画布指定位置。添加后可拖动、八向缩放，点右上锁图标可锁定宽高比。

## 如何保存大屏
点击右上角保存，或按 Ctrl+S。有未保存修改时刷新浏览器会提示确认。保存后展示页 /display/:id 读取的是已保存版本。

## 数据绑定
选中组件后打开右侧「数据绑定」。静态数据按协议表格编辑，右键可插入/删除行列。选择 API 接入后，从 API 配置页已登记的接口中选择，轮询间隔最小 5 秒。

## 下拉框如何联动其他组件
为下拉框配置交互事件，触发条件选 change，动作为调 API，并勾选目标组件。下拉框样式中的「绑定参数名」需与目标 API 的占位符参数同名。页面首次取数使用 API 配置里的 defaultValue。

## 如何保存为模板
编辑器右上角「保存为模板」写入个人模板。管理员可在模板库将个人模板提升为公共模板。

## API 配置
管理员在顶部「API 配置」新建 SQL 生成或外部登记接口。SQL 只允许单条 SELECT，参数写成 :paramName。被组件引用的 API 不能删除。

## 天气组件
天气只走系统内置接口，配置行政区划 adcode 即可。系统时间是浏览器本地时钟。

## 预览与展示
预览页全屏、无控制条。展示页右上有截图、大屏配置、全屏按钮，鼠标静止 3 秒淡出。
`;
  const chunks = content.split(/\n{2,}/).map((text) => ({ text: text.trim() })).filter((item) => item.text);
  await kbModel.create({ title, content, format: 'md', chunks });
  logger.log('知识库手册已写入');
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
