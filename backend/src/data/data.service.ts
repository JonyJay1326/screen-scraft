import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { assertReadOnlySelect, bindNamedParams, resolveApiParams } from '@screencraft/shared';
import axios from 'axios';
import { Model } from 'mongoose';
import mysql from 'mysql2/promise';
import { ApiConfig } from '../api-configs/api-config.schema';
import { BizException } from '../common/biz.exception';
import { decryptSecret } from '../common/secret.util';

/** 运行时取数：SQL 只读执行 / 外部代理 */
@Injectable()
export class DataService {
  constructor(
    @InjectModel(ApiConfig.name) private readonly apiModel: Model<ApiConfig>,
    private readonly config: ConfigService,
  ) {}

  /** 执行已登记 API */
  async execute(apiId: string, runtimeParams: Record<string, unknown>): Promise<unknown> {
    const row = await this.apiModel.findById(apiId).exec();
    if (!row) {
      throw BizException.notFound('API 配置不存在');
    }
    const params = resolveApiParams(row.params ?? [], runtimeParams);
    if (row.type === 'sql') {
      return this.runSql(row.sql ?? '', params);
    }
    return this.runExternal(row, params);
  }

  /** 执行只读 SQL */
  private async runSql(sql: string, params: Record<string, unknown>): Promise<unknown> {
    try {
      assertReadOnlySelect(sql);
    } catch (err) {
      throw BizException.sqlFail(err instanceof Error ? err.message : 'SQL 校验失败');
    }
    const bound = bindNamedParams(sql, params);
    const url = this.config.get<string>('MYSQL_URL') || this.config.get<string>('DB_URL');
    if (!url) {
      throw BizException.sqlFail('未配置 MYSQL_URL');
    }
    let conn: mysql.Connection | undefined;
    try {
      conn = await mysql.createConnection(url);
      const [rows] = await conn.query(bound.text, bound.values);
      return rows;
    } catch (err) {
      throw BizException.sqlFail(err instanceof Error ? err.message : 'SQL 执行失败');
    } finally {
      await conn?.end();
    }
  }

  /** 代理外部 API（域名白名单防 SSRF） */
  private async runExternal(
    row: ApiConfig,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const ext = row.external;
    if (!ext?.url) {
      throw BizException.proxyFail('外部 API 缺少 URL');
    }
    this.assertUrlAllowed(ext.url);
    const headers: Record<string, string> = { ...(ext.headers ?? {}) };
    const secret = row.authSecretEnc
      ? decryptSecret(row.authSecretEnc, this.config.getOrThrow<string>('JWT_SECRET'))
      : '';
    if (ext.authType === 'bearer' && secret) {
      headers.Authorization = `Bearer ${secret}`;
    } else if (ext.authType === 'basic' && secret) {
      headers.Authorization = `Basic ${Buffer.from(secret).toString('base64')}`;
    }
    try {
      const res = await axios.request({
        url: ext.url,
        method: ext.method || 'GET',
        headers,
        params: ext.method === 'GET' ? params : undefined,
        data: ext.method === 'POST' ? params : undefined,
        timeout: 15000,
        validateStatus: () => true,
      });
      if (res.status >= 400) {
        throw BizException.proxyFail(`外部 API 返回 ${res.status}`);
      }
      return res.data;
    } catch (err) {
      if (err instanceof BizException) {
        throw err;
      }
      throw BizException.proxyFail(err instanceof Error ? err.message : '外部 API 请求失败');
    }
  }

  /** 校验 URL 域名在白名单内 */
  private assertUrlAllowed(rawUrl: string): void {
    let host: string;
    try {
      host = new URL(rawUrl).hostname.toLowerCase();
    } catch {
      throw BizException.proxyFail('外部 API URL 非法');
    }
    const extra = (this.config.get<string>('API_URL_WHITELIST') || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const allow = new Set(['apis.map.qq.com', ...extra]);
    if (!allow.has(host)) {
      throw BizException.proxyFail(`域名不在白名单：${host}`);
    }
  }
}
