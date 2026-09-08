import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import type { AiSettings } from '../ai/ai.schema';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeepSeek 设置与能力测试', () => {
  it('旧配置缺少新字段时返回 v0.4 默认值', async () => {
    const service = createService();
    await expect(service.getSettings()).resolves.toMatchObject({
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      textModel: 'deepseek-v4-flash',
      visionModel: 'deepseek-v4-flash-vision-exp',
      visionEnabled: true,
    });
  });

  it('文本测试启用 JSON Output', async () => {
    const request = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '{"ok":true}' } }] },
    });
    const result = await createService({ apiKey: 'test-key' }).testSettings({ capability: 'text' });
    expect(result).toEqual({ capability: 'text', ok: true, model: 'deepseek-v4-flash' });
    const payload = request.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.response_format).toEqual({ type: 'json_object' });
  });

  it('视觉测试使用独立模型和内联图片', async () => {
    const request = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: 'ok' } }] },
    });
    const result = await createService({ apiKey: 'test-key' }).testSettings({ capability: 'vision' });
    expect(result.model).toBe('deepseek-v4-flash-vision-exp');
    const payload = request.mock.calls[0][1] as { messages: Array<{ content: unknown }> };
    expect(JSON.stringify(payload.messages[0].content)).toContain('data:image/png;base64,');
    expect(JSON.stringify(payload.messages[0].content)).toContain('original');
  });

  it('保存 Key 后只返回掩码，不返回明文', async () => {
    const view = await createService().saveSettings({
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'sk-test-secret',
      textModel: 'deepseek-v4-flash',
      visionModel: 'deepseek-v4-flash-vision-exp',
      visionEnabled: true,
    });
    expect(view.apiKeyMasked).not.toContain('sk-test-secret');
    expect('apiKey' in view).toBe(false);
  });

  it('未配置 Key 或视觉能力关闭时显式失败', async () => {
    await expect(createService().testSettings({ capability: 'text' })).rejects.toMatchObject({ bizCode: 4301 });
    await expect(createService({ apiKey: 'test-key', visionEnabled: false }).testSettings({ capability: 'vision' }))
      .rejects.toMatchObject({ bizCode: 4301 });
  });
});

function createService(options: { apiKey?: string; visionEnabled?: boolean } = {}): AiService {
  const row = {
    provider: 'deepseek' as const,
    baseUrl: '',
    apiKeyEnc: '',
    textModel: '',
    visionModel: '',
    visionEnabled: options.visionEnabled,
    chatModel: '',
    embeddingModel: '',
    save: vi.fn(async () => undefined),
  };
  const settingsModel = {
    findOne: () => ({ exec: async () => row }),
  } as unknown as Model<AiSettings>;
  const configValues: Record<string, string | undefined> = {
    LLM_API_KEY: options.apiKey,
    JWT_SECRET: 'test-jwt-secret',
  };
  const config = {
    get: (key: string) => configValues[key],
    getOrThrow: (key: string) => {
      const value = configValues[key];
      if (!value) {
        throw new Error(`missing ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService;
  const service = Object.create(AiService.prototype) as AiService;
  Object.assign(service, { kbModel: {}, settingsModel, config });
  return service;
}
