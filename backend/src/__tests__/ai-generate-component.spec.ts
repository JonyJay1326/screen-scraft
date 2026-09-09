import type { ConfigService } from '@nestjs/config';
import {
  isProtocolValid,
  validateComponentDefinitionSnapshot,
  type SafeBorderSpec,
  type SafeChartSpec,
  type ScreenDoc,
} from '@screencraft/shared';
import axios from 'axios';
import type { Model } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiReferenceAssetsService } from '../ai/ai-reference-assets.service';
import type { AiGenerateComponentDto } from '../ai/ai.dto';
import type { AiSettings } from '../ai/ai.schema';
import { AiService } from '../ai/ai.service';
import type { ScreensService } from '../screens/screens.service';
import {
  buildChineseMockData,
  buildGeneratedBorderDefinition,
  buildGeneratedChartDefinition,
} from '../ai/safe-chart.factory';

const lineSpec: SafeChartSpec = {
  kind: 'chart',
  schemaVersion: 1,
  family: 'line',
  option: {
    grid: { left: 48, right: 24, top: 40, bottom: 32 },
    palette: ['#2F7FF7', '#35E0FF'],
    legend: { show: true, position: 'top' },
    axis: { showX: true, showY: true, labelColor: '#9FB3D1', gridColor: '#23395D' },
    line: { smooth: true, width: 3, areaOpacity: 0.18, symbol: 'circle' },
  },
};

const borderSpec: SafeBorderSpec = {
  kind: 'border',
  schemaVersion: 1,
  cornerType: 'cut',
  cornerSize: 24,
  primaryColor: '#2F7FF7',
  accentColor: '#35E0FF',
  backgroundColor: 'rgba(6,18,38,0.48)',
  lineWidth: 2,
  lineOpacity: 0.9,
  innerGlow: 8,
  outerGlow: 14,
  glowOpacity: 0.45,
  titlePosition: 'topLeft',
  contentPadding: 16,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI 安全自定义图表生成', () => {
  it('七种图表族的可编辑快照和中文模拟数据都通过共享校验', () => {
    const specs: SafeChartSpec[] = [
      lineSpec,
      {
        kind: 'chart', schemaVersion: 1, family: 'bar',
        option: { bar: { width: 100, radius: 50, stack: true, horizontal: true } },
      },
      {
        kind: 'chart', schemaVersion: 1, family: 'pie',
        option: { pie: { innerRadius: 60, outerRadius: 100, roseType: 'area' } },
      },
      {
        kind: 'chart', schemaVersion: 1, family: 'combo',
        option: {
          line: { smooth: false, width: 20, areaOpacity: 1, symbol: 'rect' },
          bar: { width: 100, radius: 50, stack: false, horizontal: false },
        },
      },
      {
        kind: 'chart', schemaVersion: 1, family: 'funnel',
        option: { funnel: { sort: 'ascending', align: 'right', gap: 64 } },
      },
      {
        kind: 'chart', schemaVersion: 1, family: 'radar',
        option: { radar: { shape: 'circle', splitNumber: 12, areaOpacity: 1 } },
      },
      {
        kind: 'chart', schemaVersion: 1, family: 'gauge',
        option: {
          gauge: {
            min: -100, max: 100, startAngle: 270, endAngle: -90,
            showPointer: true, showProgress: true,
          },
        },
      },
    ];

    specs.forEach((spec) => {
      const definition = buildGeneratedChartDefinition(spec, 'editable');
      const data = buildChineseMockData(spec.family);
      expect(validateComponentDefinitionSnapshot(definition), spec.family).toEqual([]);
      expect(isProtocolValid(definition.dataProtocol, data), spec.family).toBe(true);
    });
  });

  it('返回自包含快照和符合声明协议的中文模拟数据', async () => {
    const request = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '生产趋势',
          theme: 'dark',
          styleMode: 'editable',
          safeSpec: lineSpec,
          warnings: [],
        }) } }],
      },
    });

    const result = await createService().generateComponent(createRequest(), 'user-1');

    expect(validateComponentDefinitionSnapshot(result.definitionSnapshot)).toEqual([]);
    expect(result.definitionSnapshot).toMatchObject({
      source: 'generated',
      rendererKey: 'echarts-safe-v1',
      group: 'line',
      dataProtocol: 'axis',
      specVersion: 1,
    });
    expect(isProtocolValid(result.definitionSnapshot.dataProtocol, result.defaultData)).toBe(true);
    expect(JSON.stringify(result.defaultData)).toContain('计划值');
    expect(result.editorRevision).toBe(12);

    const payload = request.mock.calls[0][1] as {
      response_format: unknown;
      messages: Array<{ content: string }>;
    };
    expect(payload.response_format).toEqual({ type: 'json_object' });
    expect(payload.messages[0].content).toContain('禁止数据、函数、formatter、renderItem、HTML、CSS、SVG、URL');
  });

  it('拒绝模型注入的 formatter 和未知安全字段', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '危险图表',
          theme: 'dark',
          styleMode: 'locked',
          safeSpec: {
            ...lineSpec,
            option: { ...lineSpec.option, formatter: 'javascript:alert(1)' },
          },
          warnings: [],
        }) } }],
      },
    });

    await expect(createService().generateComponent(createRequest(), 'user-1'))
      .rejects.toMatchObject({ bizCode: 4401 });
  });

  it('将模型常见的图例位置别名安全映射到正式枚举', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '生产趋势',
          theme: 'dark',
          styleMode: 'editable',
          safeSpec: {
            ...lineSpec,
            option: {
              ...lineSpec.option,
              legend: { show: true, position: 'right' },
            },
          },
          warnings: [],
        }) } }],
      },
    });

    const result = await createService().generateComponent(createRequest(), 'user-1');

    expect(result.definitionSnapshot.safeSpec).toMatchObject({
      option: { legend: { position: 'topRight' } },
    });
    expect(result.warnings).toContain('图例位置 right 已安全映射为 topRight');
    expect(validateComponentDefinitionSnapshot(result.definitionSnapshot)).toEqual([]);
  });

  it('忽略模型输出的雷达图半径并明确提示使用默认值', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '能力雷达',
          theme: 'dark',
          styleMode: 'editable',
          safeSpec: {
            kind: 'chart',
            schemaVersion: 1,
            family: 'radar',
            option: {
              radar: {
                shape: 'polygon',
                splitNumber: 5,
                areaOpacity: 0.24,
                radius: '72%',
              },
            },
          },
          warnings: [],
        }) } }],
      },
    });

    const result = await createService().generateComponent(createRequest(), 'user-1');

    expect(result.definitionSnapshot.safeSpec).toMatchObject({
      option: { radar: { shape: 'polygon', splitNumber: 5, areaOpacity: 0.24 } },
    });
    expect((result.definitionSnapshot.safeSpec as SafeChartSpec).option.radar)
      .not.toHaveProperty('radius');
    expect(result.warnings).toContain('雷达图半径不在安全契约中，已使用 renderer 默认值');
    expect(validateComponentDefinitionSnapshot(result.definitionSnapshot)).toEqual([]);
  });

  it('生成可编辑参数化边框快照且不包含数据协议', async () => {
    const request = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '蓝青科技边框',
          theme: 'dark',
          styleMode: 'editable',
          safeSpec: borderSpec,
          warnings: ['参考图纹理已使用参数化发光近似'],
        }) } }],
      },
    });

    const result = await createService().generateComponent({ ...createRequest(), kind: 'border' }, 'user-1');

    expect(result.definitionSnapshot).toMatchObject({
      rendererKey: 'border-parametric-v1',
      category: 'decoration',
      group: 'border',
      styleMode: 'editable',
    });
    expect(result.definitionSnapshot.dataProtocol).toBeUndefined();
    expect(result.defaultData).toBeUndefined();
    expect(validateComponentDefinitionSnapshot(result.definitionSnapshot)).toEqual([]);
    expect(result.style).toMatchObject({ cornerType: 'cut', contentPadding: 16 });
    const payload = request.mock.calls[0][1] as { messages: Array<{ content: string }> };
    expect(payload.messages[0].content).toContain('禁止函数、HTML、CSS、SVG/path 原文、URL');
  });

  it('拒绝参数化边框中的原始 SVG 和越界参数', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '危险边框',
          theme: 'dark',
          styleMode: 'editable',
          safeSpec: { ...borderSpec, cornerSize: 161, rawSvg: '<svg><script /></svg>' },
          warnings: [],
        }) } }],
      },
    });

    await expect(createService().generateComponent({ ...createRequest(), kind: 'border' }, 'user-1'))
      .rejects.toMatchObject({ bizCode: 4401 });
  });

  it('边框批准字段完整通过快照校验', () => {
    const definition = buildGeneratedBorderDefinition(borderSpec);
    expect(validateComponentDefinitionSnapshot(definition)).toEqual([]);
    expect(definition.styleSchema.map((field) => field.key)).toEqual(expect.arrayContaining([
      'cornerType', 'cornerSize', 'primaryColor', 'accentColor', 'backgroundColor',
      'lineWidth', 'lineOpacity', 'innerGlow', 'outerGlow', 'glowOpacity',
      'titlePosition', 'contentPadding',
    ]));
  });
});

function createRequest(): AiGenerateComponentDto {
  return {
    screenId: 'screen-1',
    pageId: 'page-1',
    instruction: '生成蓝青色生产趋势折线图',
    kind: 'chart',
    editorRevision: 12,
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
  };
  const settingsModel = {
    findOne: () => ({ exec: async () => settings }),
  } as unknown as Model<AiSettings>;
  const configValues: Record<string, string> = {
    LLM_API_KEY: 'test-key',
    JWT_SECRET: 'test-secret',
  };
  const config = {
    get: (key: string) => configValues[key],
    getOrThrow: (key: string) => configValues[key],
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
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
  } satisfies ScreenDoc;
  const screens = { getById: vi.fn(async () => screen) } as unknown as ScreensService;
  const referenceAssets = { readOwned: vi.fn() } as unknown as AiReferenceAssetsService;
  return new AiService({} as never, settingsModel, config, screens, referenceAssets);
}
