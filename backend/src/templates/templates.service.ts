import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category, ScreenDoc } from '@screencraft/shared';
import { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { createBlankPage } from '../screens/page.factory';
import { toScreenDoc } from '../screens/screen.mapper';
import { Screen } from '../screens/screen.schema';
import { ScreenTemplate } from './template.schema';

export interface TemplateListItem {
  _id: string;
  name: string;
  category: Category;
  scope: 'public' | 'personal';
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

/** 模板库 */
@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(ScreenTemplate.name) private readonly templateModel: Model<ScreenTemplate>,
    @InjectModel(Screen.name) private readonly screenModel: Model<Screen>,
  ) {}

  /** 列表 */
  async list(scope: 'public' | 'personal', ownerId: string, category?: string): Promise<TemplateListItem[]> {
    const filter: Record<string, unknown> = scope === 'public' ? { scope: 'public' } : { scope: 'personal', ownerId };
    if (category) {
      filter.category = category;
    }
    const rows = await this.templateModel.find(filter).sort({ updatedAt: -1 }).exec();
    return rows.map((row) => ({
      _id: String(row._id),
      name: row.name,
      category: row.category,
      scope: row.scope,
      thumbnail: row.screenSnapshot.thumbnail,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /** 另存为个人模板 */
  async saveAsTemplate(
    screenId: string,
    ownerId: string,
    name: string,
    category: Category,
  ): Promise<TemplateListItem> {
    const screen = await this.screenModel.findById(screenId).exec();
    if (!screen) {
      throw BizException.notFound('大屏不存在');
    }
    const doc = await this.templateModel.create({
      scope: 'personal',
      name: name.trim(),
      category,
      ownerId,
      screenSnapshot: {
        name: name.trim(),
        category,
        deployed: false,
        fitMode: screen.fitMode,
        canvas: screen.canvas,
        pages: JSON.parse(JSON.stringify(screen.pages)),
        thumbnail: screen.thumbnail,
      },
    });
    return {
      _id: String(doc._id),
      name: doc.name,
      category: doc.category,
      scope: doc.scope,
      thumbnail: doc.screenSnapshot.thumbnail,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /** 以此模板新建大屏 */
  async createScreen(templateId: string, projectId: string): Promise<ScreenDoc> {
    const tpl = await this.templateModel.findById(templateId).exec();
    if (!tpl) {
      throw BizException.notFound('模板不存在');
    }
    const snap = tpl.screenSnapshot;
    const created = await this.screenModel.create({
      projectId,
      name: snap.name,
      category: snap.category,
      deployed: false,
      fitMode: snap.fitMode,
      canvas: snap.canvas,
      pages: snap.pages?.length ? JSON.parse(JSON.stringify(snap.pages)) : [createBlankPage()],
      thumbnail: snap.thumbnail,
    });
    return toScreenDoc(created);
  }

  /** 删除个人模板 */
  async remove(id: string, ownerId: string, isAdmin: boolean): Promise<{ ok: true }> {
    const tpl = await this.templateModel.findById(id).exec();
    if (!tpl) {
      throw BizException.notFound('模板不存在');
    }
    if (tpl.scope === 'public' && !isAdmin) {
      throw BizException.forbidden();
    }
    if (tpl.scope === 'personal' && tpl.ownerId !== ownerId && !isAdmin) {
      throw BizException.forbidden();
    }
    await this.templateModel.deleteOne({ _id: id });
    return { ok: true };
  }

  /** 提升为公共模板 */
  async promote(id: string): Promise<TemplateListItem> {
    const tpl = await this.templateModel.findById(id).exec();
    if (!tpl) {
      throw BizException.notFound('模板不存在');
    }
    tpl.scope = 'public';
    await tpl.save();
    return {
      _id: String(tpl._id),
      name: tpl.name,
      category: tpl.category,
      scope: tpl.scope,
      thumbnail: tpl.screenSnapshot.thumbnail,
      createdAt: tpl.createdAt.toISOString(),
      updatedAt: tpl.updatedAt.toISOString(),
    };
  }
}
