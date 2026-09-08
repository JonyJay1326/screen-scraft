import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import type { ScreenDoc } from '@screencraft/shared';
import { AiService } from '../ai/ai.service';
import type { AiSettings } from '../ai/ai.schema';
import type { ScreensService } from '../screens/screens.service';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI 选中组件样式方案', () => {
  it('仅发送可写字段目录，并保留合法样式补丁', async () => {
    const request = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          summary: '隐藏图例、加粗折线并使用蓝青配色',
          operations: [{
            targetType: 'component',
            targetId: 'c1',
            stylePatch: { showLegend: false, lineWidth: 4, seriesColors: ['#2F7FF7', '#35E0FF'] },
          }],
          skipped: [],
          unsupportedFeatures: [],
          warnings: [],
        }) } }],
      },
    });
    const result = await createService().createEditorPlan(createRequest(), 'user-1');
    expect(result.operations).toEqual([{
      targetType: 'component',
      targetId: 'c1',
      stylePatch: { showLegend: false, lineWidth: 4, seriesColors: ['#2F7FF7', '#35E0FF'] },
    }]);
    expect(result.editorRevision).toBe(7);
    const payload = request.mock.calls[0][1] as { response_format: unknown; messages: Array<{ content: string }> };
    expect(payload.response_format).toEqual({ type: 'json_object' });
    expect(payload.messages[1].content).toContain('allowedFields');
    expect(payload.messages[1].content).not.toContain('staticData');
  });

  it('丢弃未声明、只读和越界字段，同时保留部分合法结果', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          summary: '调整折线',
          operations: [{
            targetType: 'component',
            targetId: 'c1',
            stylePatch: { lineWidth: 4, boardTitle: '越权文本', formatter: 'x', areaOpacity: 101 },
          }],
          skipped: [],
          unsupportedFeatures: [],
          warnings: [],
        }) } }],
      },
    });
    const result = await createService().createEditorPlan(createRequest(), 'user-1');
    expect(result.operations).toEqual([{ targetType: 'component', targetId: 'c1', stylePatch: { lineWidth: 4 } }]);
    expect(result.warnings).toHaveLength(3);
  });

  it('锁定与隐藏组件直接跳过，不调用模型', async () => {
    const request = vi.spyOn(axios, 'post');
    const dto = createRequest();
    dto.componentIds = ['c1', 'c2'];
    dto.context.components[0].locked = true;
    dto.context.components.push({
      ...dto.context.components[0],
      id: 'c2',
      name: '隐藏图表',
      locked: false,
      hidden: true,
    });
    const result = await createService().createEditorPlan(dto, 'user-1');
    expect(result.operations).toEqual([]);
    expect(result.skipped.map((item) => item.reason)).toEqual(['组件已锁定', '隐藏组件默认不参与修改']);
    expect(request).not.toHaveBeenCalled();
  });

  it('空输出只重试一次，仍为空时返回 4302', async () => {
    const request = vi.spyOn(axios, 'post').mockResolvedValue({ data: { choices: [{ message: { content: '' } }] } });
    await expect(createService().createEditorPlan(createRequest(), 'user-1')).rejects.toMatchObject({ bizCode: 4302 });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

function createRequest() {
  return {
    screenId: 'screen-1',
    pageId: 'page-1',
    scope: 'selected' as const,
    componentIds: ['c1'],
    instruction: '隐藏图例、线宽改为 4、蓝青配色',
    editorRevision: 7,
    context: {
      components: [{
        id: 'c1',
        templateId: 'chart-line-1',
        name: '趋势图',
        theme: 'dark' as const,
        locked: false,
        hidden: false,
        style: { lineWidth: 2, showLegend: true },
      }],
    },
  };
}

function createService(): AiService {
  const settings = {
    provider: 'deepseek' as const,
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnc: '',
    textModel: 'deepseek-v4-flash',
    visionModel: 'deepseek-v4-flash-vision-exp',
    visionEnabled: true,
    chatModel: '',
    embeddingModel: '',
    save: vi.fn(async () => undefined),
  };
  const settingsModel = { findOne: () => ({ exec: async () => settings }) } as unknown as Model<AiSettings>;
  const configValues: Record<string, string | undefined> = {
    LLM_API_KEY: 'test-key',
    JWT_SECRET: 'test-secret',
  };
  const config = {
    get: (key: string) => configValues[key],
    getOrThrow: (key: string) => configValues[key] ?? (() => { throw new Error(`missing ${key}`); })(),
  } as unknown as ConfigService;
  const screen = {
    _id: 'screen-1',
    projectId: 'project-1',
    name: '测试大屏',
    category: '通用',
    deployed: false,
    fitMode: 'center',
    canvas: { width: 1920, height: 1080 },
    pages: [{
      id: 'page-1',
      name: '页面 1',
      parentId: null,
      background: { type: 'normal', color: '#0D1730', opacity: 100, fill: 'cover' },
      components: [],
    }],
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
  } satisfies ScreenDoc;
  const screens = { getById: vi.fn(async () => screen) } as unknown as ScreensService;
  return new AiService({} as never, settingsModel, config, screens);
}
