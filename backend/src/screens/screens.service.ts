import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ScreenDoc } from '@screencraft/shared';
import { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { Project } from '../projects/project.schema';
import { createBlankPage } from './page.factory';
import { toScreenDoc } from './screen.mapper';
import { Screen } from './screen.schema';

/** 大屏 CRUD / 保存 / 复制 / 投放 */
@Injectable()
export class ScreensService {
  constructor(
    @InjectModel(Screen.name) private readonly screenModel: Model<Screen>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  /** 项目下大屏列表 */
  async listByProject(projectId: string): Promise<ScreenDoc[]> {
    await this.requireProject(projectId);
    const rows = await this.screenModel.find({ projectId }).sort({ updatedAt: -1 }).exec();
    return rows.map((row) => toScreenDoc(row));
  }

  /** 新建空白大屏并进入编辑 */
  async create(input: { projectId: string; name: string; category: ScreenDoc['category'] }): Promise<ScreenDoc> {
    await this.requireProject(input.projectId);
    const doc = await this.screenModel.create({
      projectId: input.projectId,
      name: input.name.trim(),
      category: input.category,
      deployed: false,
      fitMode: 'center',
      canvas: { width: 1920, height: 1080 },
      pages: [createBlankPage()],
    });
    return toScreenDoc(doc);
  }

  /** 编辑用完整文档 */
  async getById(id: string): Promise<ScreenDoc> {
    const doc = await this.requireScreen(id);
    return toScreenDoc(doc);
  }

  /** 整屏覆盖保存，updatedAt 冲突返回 4001 */
  async save(id: string, payload: Partial<ScreenDoc> & { updatedAt: string }): Promise<ScreenDoc> {
    const doc = await this.requireScreen(id);
    if (doc.updatedAt.toISOString() !== payload.updatedAt) {
      throw BizException.validation('大屏已被其他人更新，请刷新后重试');
    }
    if (payload.name) {
      doc.name = payload.name;
    }
    if (payload.category) {
      doc.category = payload.category;
    }
    if (payload.fitMode) {
      doc.fitMode = payload.fitMode;
    }
    if (payload.pages) {
      doc.pages = payload.pages;
    }
    if (payload.thumbnail !== undefined) {
      doc.thumbnail = payload.thumbnail;
    }
    await doc.save();
    return toScreenDoc(doc);
  }

  /** 删除 */
  async remove(id: string): Promise<{ ok: true }> {
    const doc = await this.requireScreen(id);
    await this.screenModel.deleteOne({ _id: doc._id });
    return { ok: true };
  }

  /** 复制，名称加「-副本」 */
  async copy(id: string): Promise<ScreenDoc> {
    const doc = await this.requireScreen(id);
    const cloned = await this.screenModel.create({
      projectId: doc.projectId,
      name: `${doc.name}-副本`,
      category: doc.category,
      deployed: false,
      fitMode: doc.fitMode,
      canvas: doc.canvas,
      pages: JSON.parse(JSON.stringify(doc.pages)) as Screen['pages'],
      thumbnail: doc.thumbnail,
    });
    return toScreenDoc(cloned);
  }

  /** 投放标记 */
  async setDeployed(id: string, deployed: boolean): Promise<ScreenDoc> {
    const doc = await this.requireScreen(id);
    doc.deployed = deployed;
    await doc.save();
    return toScreenDoc(doc);
  }

  /** 统计 API 被组件引用次数 */
  async countApiRefs(apiId: string): Promise<number> {
    const rows = await this.screenModel.find({ 'pages.components.data.apiId': apiId }).exec();
    let count = 0;
    rows.forEach((row) => {
      row.pages.forEach((page) => {
        page.components.forEach((comp) => {
          if (comp.data?.apiId === apiId) {
            count += 1;
          }
        });
      });
    });
    return count;
  }

  /** 校验项目存在 */
  private async requireProject(projectId: string) {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw BizException.notFound('项目不存在');
    }
    return project;
  }

  /** 校验大屏存在 */
  private async requireScreen(id: string) {
    const doc = await this.screenModel.findById(id).exec();
    if (!doc) {
      throw BizException.notFound('大屏不存在');
    }
    return doc;
  }
}
