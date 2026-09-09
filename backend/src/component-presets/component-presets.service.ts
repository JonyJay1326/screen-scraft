import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  validateComponentDefinitionSnapshot,
  type ComponentDefinitionSnapshot,
  type CustomComponentPreset,
} from '@screencraft/shared';
import { Model, Types } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { ComponentPreset, type ComponentPresetDocument } from './component-preset.schema';
import { CreateComponentPresetDto, UpdateComponentPresetDto } from './component-presets.dto';

@Injectable()
export class ComponentPresetsService {
  constructor(@InjectModel(ComponentPreset.name) private readonly presetModel: Model<ComponentPreset>) {}

  async list(
    scope: 'personal' | 'public',
    ownerId: string,
    category?: 'chart' | 'decoration',
  ): Promise<CustomComponentPreset[]> {
    const filter: Record<string, unknown> = scope === 'public' ? { scope } : { scope, ownerId };
    if (category) {
      filter['definition.category'] = category;
    }
    const rows = await this.presetModel.find(filter).sort({ updatedAt: -1 }).exec();
    return rows.map(toPreset);
  }

  async getById(id: string, userId: string, isAdmin: boolean): Promise<CustomComponentPreset> {
    const row = await this.requirePreset(id);
    if (row.scope === 'personal' && row.ownerId !== userId && !isAdmin) {
      throw BizException.forbidden();
    }
    return toPreset(row);
  }

  async create(dto: CreateComponentPresetDto, ownerId: string): Promise<CustomComponentPreset> {
    this.assertSupportedDefinition(dto.definition);
    const name = requireName(dto.name);
    const id = new Types.ObjectId();
    const row = await this.presetModel.create({
      _id: id,
      ownerId,
      name,
      description: dto.description?.trim() || undefined,
      scope: 'personal',
      definition: normalizeDefinition(dto.definition, 'personal', String(id), 1),
      thumbnail: normalizeThumbnail(dto.thumbnail),
    });
    return toPreset(row);
  }

  async update(id: string, dto: UpdateComponentPresetDto, ownerId: string): Promise<CustomComponentPreset> {
    const row = await this.requireOwnedPersonal(id, ownerId);
    const source = dto.definition ?? row.definition;
    this.assertSupportedDefinition(source);
    const nextVersion = row.definition.specVersion + 1;
    row.definition = normalizeDefinition(source, 'personal', String(row._id), nextVersion);
    if (dto.name !== undefined) {
      row.name = requireName(dto.name);
    }
    if (dto.description !== undefined) {
      row.description = dto.description.trim() || undefined;
    }
    if (dto.thumbnail !== undefined) {
      row.thumbnail = normalizeThumbnail(dto.thumbnail);
    }
    await row.save();
    return toPreset(row);
  }

  async copy(id: string, ownerId: string): Promise<CustomComponentPreset> {
    const source = await this.requireOwnedPersonal(id, ownerId);
    const nextId = new Types.ObjectId();
    const row = await this.presetModel.create({
      _id: nextId,
      ownerId,
      name: `${source.name}-副本`,
      description: source.description,
      scope: 'personal',
      definition: normalizeDefinition(source.definition, 'personal', String(nextId), 1),
      thumbnail: source.thumbnail,
    });
    return toPreset(row);
  }

  async remove(id: string, ownerId: string): Promise<{ ok: true }> {
    const row = await this.requireOwnedPersonal(id, ownerId);
    await this.presetModel.deleteOne({ _id: row._id }).exec();
    return { ok: true };
  }

  async promote(id: string, adminId: string): Promise<CustomComponentPreset> {
    const source = await this.requirePreset(id);
    this.assertSupportedDefinition(source.definition);
    const nextId = new Types.ObjectId();
    const row = await this.presetModel.create({
      _id: nextId,
      ownerId: adminId,
      name: source.name,
      description: source.description,
      scope: 'public',
      definition: normalizeDefinition(source.definition, 'public', String(nextId), 1),
      thumbnail: source.thumbnail,
    });
    return toPreset(row);
  }

  private assertSupportedDefinition(definition: ComponentDefinitionSnapshot): void {
    const issues = validateComponentDefinitionSnapshot(definition);
    if (issues.length) {
      throw BizException.componentDefinitionInvalid(`${issues[0].path}: ${issues[0].message}`);
    }
    if (definition.rendererKey !== 'echarts-safe-v1' || definition.category !== 'chart') {
      throw BizException.componentDefinitionInvalid('M9.4 仅支持保存安全自定义图表');
    }
  }

  private async requirePreset(id: string): Promise<ComponentPresetDocument> {
    const row = await this.presetModel.findById(id).exec().catch(() => null);
    if (!row) {
      throw BizException.notFound('个人组件不存在');
    }
    return row;
  }

  private async requireOwnedPersonal(id: string, ownerId: string): Promise<ComponentPresetDocument> {
    const row = await this.requirePreset(id);
    if (row.scope !== 'personal' || row.ownerId !== ownerId) {
      throw BizException.forbidden('只能操作自己的个人组件');
    }
    return row;
  }
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw BizException.validation('个人组件名称不能为空');
  }
  return trimmed;
}

function normalizeThumbnail(thumbnail?: string): string | undefined {
  const value = thumbnail?.trim();
  if (!value) {
    return undefined;
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0 || Buffer.from(match[2], 'base64').byteLength > 300 * 1024) {
    throw BizException.validation('个人组件缩略图格式不合法或超过 300KB');
  }
  return value;
}

function normalizeDefinition(
  definition: ComponentDefinitionSnapshot,
  source: 'personal' | 'public',
  presetId: string,
  specVersion: number,
): ComponentDefinitionSnapshot {
  return {
    ...JSON.parse(JSON.stringify(definition)) as ComponentDefinitionSnapshot,
    source,
    presetId,
    specVersion,
  };
}

function toPreset(row: ComponentPresetDocument): CustomComponentPreset {
  return {
    _id: String(row._id),
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    scope: row.scope,
    definition: JSON.parse(JSON.stringify(row.definition)) as ComponentDefinitionSnapshot,
    thumbnail: row.thumbnail,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
