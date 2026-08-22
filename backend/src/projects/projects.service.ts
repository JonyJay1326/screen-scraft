import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { Screen } from '../screens/screen.schema';
import { Project } from './project.schema';

export interface ProjectListItem {
  _id: string;
  name: string;
  screenCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 项目管理 */
@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Screen.name) private readonly screenModel: Model<Screen>,
  ) {}

  /** 列表（含大屏数） */
  async list(): Promise<ProjectListItem[]> {
    const rows = await this.projectModel.find().sort({ updatedAt: -1 }).exec();
    const counts = await this.screenModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
    return rows.map((row) => ({
      _id: String(row._id),
      name: row.name,
      screenCount: countMap.get(String(row._id)) ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /** 新建 */
  async create(name: string): Promise<ProjectListItem> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw BizException.validation('项目名称不能为空');
    }
    const doc = await this.projectModel.create({ name: trimmed });
    return {
      _id: String(doc._id),
      name: doc.name,
      screenCount: 0,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /** 重命名 */
  async update(id: string, name: string): Promise<ProjectListItem> {
    const doc = await this.projectModel.findById(id).exec();
    if (!doc) {
      throw BizException.notFound('项目不存在');
    }
    doc.name = name.trim();
    await doc.save();
    const screenCount = await this.screenModel.countDocuments({ projectId: id });
    return {
      _id: String(doc._id),
      name: doc.name,
      screenCount,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /** 删除项目并级联大屏 */
  async remove(id: string): Promise<{ ok: true; deletedScreens: number }> {
    const doc = await this.projectModel.findById(id).exec();
    if (!doc) {
      throw BizException.notFound('项目不存在');
    }
    const result = await this.screenModel.deleteMany({ projectId: id });
    await this.projectModel.deleteOne({ _id: id });
    return { ok: true, deletedScreens: result.deletedCount };
  }
}
