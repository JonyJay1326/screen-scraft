import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { assertReadOnlySelect, ProtocolKind, validateProtocol } from '@screencraft/shared';
import { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { encryptSecret } from '../common/secret.util';
import { DataService } from '../data/data.service';
import { ScreensService } from '../screens/screens.service';
import { toApiConfigDoc, ApiConfigListItem } from './api-config.mapper';
import { ApiConfig } from './api-config.schema';
import { TestApiDto, UpsertApiConfigDto } from './api-configs.dto';

/** API 配置 CRUD / 试运行 / 删除保护 */
@Injectable()
export class ApiConfigsService {
  constructor(
    @InjectModel(ApiConfig.name) private readonly model: Model<ApiConfig>,
    private readonly screens: ScreensService,
    private readonly data: DataService,
    private readonly config: ConfigService,
  ) {}

  /** 列表（含引用数，不含密钥） */
  async list(): Promise<ApiConfigListItem[]> {
    const rows = await this.model.find().sort({ updatedAt: -1 }).exec();
    const mapped: ApiConfigListItem[] = [];
    for (const row of rows) {
      const refCount = await this.screens.countApiRefs(String(row._id));
      mapped.push(toApiConfigDoc(row, refCount));
    }
    return mapped;
  }

  /** 详情 */
  async getById(id: string): Promise<ApiConfigListItem> {
    const row = await this.require(id);
    const refCount = await this.screens.countApiRefs(id);
    return toApiConfigDoc(row, refCount);
  }

  /** 新建 */
  async create(dto: UpsertApiConfigDto): Promise<ApiConfigListItem> {
    if (dto.type === 'mock') {
      throw BizException.validation('Mock API 仅允许通过演示种子生成');
    }
    this.validateDto(dto);
    const row = await this.model.create(this.toDoc(dto, undefined));
    return toApiConfigDoc(row, 0);
  }

  /** 更新 */
  async update(id: string, dto: UpsertApiConfigDto): Promise<ApiConfigListItem> {
    const row = await this.require(id);
    if (dto.type === 'mock' && row.type !== 'mock') {
      throw BizException.validation('普通 API 不能转换为 Mock API');
    }
    this.validateDto(dto);
    Object.assign(row, this.toDoc(dto, row.authSecretEnc));
    await row.save();
    const refCount = await this.screens.countApiRefs(id);
    return toApiConfigDoc(row, refCount);
  }

  /** 删除（被引用则拒绝） */
  async remove(id: string): Promise<{ ok: true }> {
    const refCount = await this.screens.countApiRefs(id);
    if (refCount > 0) {
      throw BizException.validation(`该 API 被 ${refCount} 个组件引用，无法删除`);
    }
    await this.require(id);
    await this.model.deleteOne({ _id: id }).exec();
    return { ok: true };
  }

  /** 试运行 */
  async test(id: string, dto: TestApiDto) {
    const raw = await this.data.execute(id, dto.params ?? {});
    const protocol = dto.protocol as ProtocolKind | undefined;
    const protocolIssues = protocol ? validateProtocol(protocol, raw) : [];
    const table = toTable(raw);
    return {
      raw,
      columns: table.columns,
      rows: table.rows,
      protocolIssues,
      protocolValid: protocolIssues.length === 0,
    };
  }

  /** 取内部文档（供 data 模块） */
  async require(id: string) {
    const row = await this.model.findById(id).exec();
    if (!row) {
      throw BizException.notFound('API 配置不存在');
    }
    return row;
  }

  /** 入参校验 */
  private validateDto(dto: UpsertApiConfigDto): void {
    if (dto.type === 'sql') {
      if (!dto.sql?.trim()) {
        throw BizException.validation('请填写 SQL');
      }
      try {
        assertReadOnlySelect(dto.sql);
      } catch (error) {
        throw BizException.sqlFail((error as Error).message);
      }
    } else if (dto.type === 'external' && !dto.external?.url) {
      throw BizException.validation('请填写外部接口地址');
    } else if (dto.type === 'mock' && !dto.mockKey?.trim()) {
      throw BizException.validation('Mock 配置缺少 mockKey');
    }
  }

  /** DTO 转存储字段 */
  private toDoc(dto: UpsertApiConfigDto, prevEnc?: string) {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    let authSecretEnc = prevEnc;
    if (dto.external?.authSecret) {
      authSecretEnc = encryptSecret(dto.external.authSecret, secret);
    }
    const { authSecret: _omit, ...externalRest } = dto.external ?? {};
    return {
      name: dto.name.trim(),
      type: dto.type,
      dataProtocol: dto.dataProtocol,
      sql: dto.type === 'sql' ? dto.sql : undefined,
      mockKey: dto.type === 'mock' ? dto.mockKey?.trim() : undefined,
      external: dto.type === 'external' ? externalRest : undefined,
      authSecretEnc: dto.type === 'external' ? authSecretEnc : undefined,
      params: dto.params,
    };
  }
}

/** 把任意 JSON 尽量转成表格预览 */
function toTable(raw: unknown): { columns: string[]; rows: Record<string, unknown>[] } {
  if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
    const keys = Object.keys(raw[0] as object);
    return { columns: keys, rows: raw as Record<string, unknown>[] };
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as { rows?: unknown }).rows)) {
    const body = raw as { columns?: { key: string }[]; rows: Record<string, unknown>[] };
    const columns = body.columns?.map((col) => col.key) ?? Object.keys(body.rows[0] ?? {});
    return { columns, rows: body.rows };
  }
  return { columns: ['value'], rows: [{ value: JSON.stringify(raw) }] };
}
