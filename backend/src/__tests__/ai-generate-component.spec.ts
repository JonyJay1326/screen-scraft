import type { ConfigService } from '@nestjs/config';
import {
  isProtocolValid,
  validateComponentDefinitionSnapshot,
  validateSafeChartSpec,
  type SafeBorderSpec,
  type SafeChartSpec,
  type ComponentDoc,
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
import { projectGeneratedChartSpec } from '../ai/safe-chart.projection';
import { buildSafeChartOption } from '../../../frontend/src/registry/safe-chart-option';

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
      safeSpec: { schemaVersion: 2, fidelity: 'approximate' },
    });
    expect(result.fidelity).toBe('approximate');
    expect(result.unsupportedFeatures).toEqual([]);
    expect(isProtocolValid(result.definitionSnapshot.dataProtocol, result.defaultData)).toBe(true);
    expect(JSON.stringify(result.defaultData)).toContain('计划值');
    expect(result.editorRevision).toBe(12);

    const payload = request.mock.calls[0][1] as {
      response_format: unknown;
      messages: Array<{ content: string }>;
    };
    expect(payload.response_format).toEqual({ type: 'json_object' });
    expect(payload.messages[0].content).toContain('禁止数据、series、dataset、函数 formatter、renderItem、HTML、CSS、完整 SVG/XML');
  });

  it('拒绝模型注入的可执行 formatter', async () => {
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

  it('将模型常见的图例位置值投影到 v2 正式枚举', async () => {
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
      schemaVersion: 2,
      option: { legend: { position: 'right' } },
    });
    expect(result.fidelity).toBe('approximate');
    expect(validateComponentDefinitionSnapshot(result.definitionSnapshot)).toEqual([]);
  });

  it('保留并归一化模型输出的雷达图半径', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '能力雷达',
          theme: 'dark',
          styleMode: 'editable',
          safeSpec: {
            kind: 'chart',
            schemaVersion: 2,
            family: 'radar',
            fidelity: 'exact',
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
      schemaVersion: 2,
      option: { radar: { shape: 'polygon', splitNumber: 5, areaOpacity: 0.24, radius: 72 } },
    });
    expect(result.warnings).toEqual([]);
    expect(result.fidelity).toBe('exact');
    expect(validateComponentDefinitionSnapshot(result.definitionSnapshot)).toEqual([]);
  });

  it('保留七类图表的安全视觉扩展，并硬拒绝危险字段', () => {
    const projected = projectGeneratedChartSpec({
      kind: 'chart',
      schemaVersion: 2,
      family: 'pie',
      fidelity: 'exact',
      option: {
        pie: { radius: ['40%', '70%'], shadowBlur: 20 },
        animationDuration: 300,
      },
    });
    expect(projected.rejectedReason).toBeUndefined();
    expect(projected.safeSpec?.schemaVersion).toBe(2);
    expect(projected.safeSpec?.fidelity).toBe('exact');
    expect(projected.safeSpec?.option.visual).toMatchObject({
      root: { animationDuration: 300 },
      series: { itemStyle: { shadowBlur: 20 } },
    });
    expect(projected.warnings).toEqual([]);
    expect(validateSafeChartSpec(projected.safeSpec)).toEqual([]);

    const rejected = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'line',
      option: { line: { formatter: 'javascript:alert(1)' } },
    });
    expect(rejected.rejectedReason).toContain('formatter');
    expect(rejected.safeSpec).toBeUndefined();

    const rawSvg = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'pie',
      option: { pie: { rawSvg: '<svg><path /></svg>' } },
    });
    expect(rawSvg.rejectedReason).toContain('rawSvg');
  });

  it('将雷达图扁平视觉字段投影到坐标系与系列，且不为安全归一化降级', () => {
    const projected = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
      option: {
        grid: { left: 10 },
        axis: { showX: false },
        radar: {
          centerX: '50%', centerY: '55%', radius: '65%',
          axisLineWidth: 2, splitLineWidth: 1, splitAreaColor: 'rgba(47,127,247,0.08)',
          areaColor: 'rgba(53,224,255,0.25)', lineType: 'dashed',
        },
      },
    });

    expect(projected.rejectedReason).toBeUndefined();
    expect(projected.warnings).toEqual([]);
    expect(projected.safeSpec).toMatchObject({
      fidelity: 'exact',
      option: {
        radar: { centerX: 50, centerY: 55, radius: 65 },
        visual: {
          coordinate: {
            axisLine: { lineStyle: { width: 2 } },
            splitLine: { lineStyle: { width: 1 } },
            splitArea: { areaStyle: { color: ['rgba(47,127,247,0.08)'] } },
          },
          series: {
            areaStyle: { color: 'rgba(53,224,255,0.25)' },
            lineStyle: { type: 'dashed' },
          },
        },
      },
    });
    expect(validateSafeChartSpec(projected.safeSpec)).toEqual([]);
  });

  it('接受安全 formatter 与受限 path，拒绝 HTML formatter 和超复杂路径', () => {
    const safe = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'line', fidelity: 'exact',
      option: {
        line: { symbol: 'path://M0 0 L10 0 L5 10 Z' },
        visual: { series: { label: { formatter: '{b}: {c}' } } },
      },
    });
    expect(safe.rejectedReason).toBeUndefined();
    expect(safe.safeSpec?.option.visual?.series).toMatchObject({
      symbol: 'path://M0 0 L10 0 L5 10 Z',
      label: { formatter: '{b}: {c}' },
    });
    expect(validateSafeChartSpec(safe.safeSpec)).toEqual([]);

    const html = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'line',
      option: { line: {}, visual: { series: { label: { formatter: '<b>{c}</b>' } } } },
    });
    expect(html.rejectedReason).toContain('formatter');

    const complexPath = `path://${Array.from({ length: 300 }, (_, index) => `M${index} ${index}`).join(' ')}`;
    const rejectedPath = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'line',
      option: { line: {}, visual: { series: { symbol: complexPath } } },
    });
    expect(rejectedPath.rejectedReason).toContain('path://');
  });

  it('七种图表族投影为合法 v2，200 次配置投影低于一秒', () => {
    const families: SafeChartSpec['family'][] = ['line', 'bar', 'pie', 'combo', 'funnel', 'radar', 'gauge'];
    families.forEach((family) => {
      const familyOption = family === 'combo'
        ? { line: { shadowBlur: 12 }, bar: { shadowBlur: 12 } }
        : { [family]: { shadowBlur: 12 } };
      const projected = projectGeneratedChartSpec({
        kind: 'chart', schemaVersion: 2, family, fidelity: 'exact', option: familyOption,
      });
      expect(projected.rejectedReason, family).toBeUndefined();
      expect(projected.warnings, family).toEqual([]);
      expect(projected.safeSpec?.fidelity, family).toBe('exact');
      expect(validateSafeChartSpec(projected.safeSpec), family).toEqual([]);
      const definition = buildGeneratedChartDefinition(projected.safeSpec!, 'locked');
      expect(validateComponentDefinitionSnapshot(definition), family).toEqual([]);
    });

    const complete = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact', option: { radar: {} },
    }).safeSpec!;
    const exactRoundTrip = projectGeneratedChartSpec({ ...complete, fidelity: 'exact' });
    expect(exactRoundTrip.warnings).toEqual([]);
    expect(exactRoundTrip.safeSpec?.fidelity).toBe('exact');

    const startedAt = performance.now();
    let generatedCount = 0;
    for (let index = 0; index < 200; index += 1) {
      const projected = projectGeneratedChartSpec({
        kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
        option: { radar: { radius: `${60 + (index % 20)}%` } },
      });
      if (projected.safeSpec) generatedCount += 1;
    }
    expect(generatedCount).toBe(200);
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });

  it('七族视觉扩展进入最终渲染 option，保留业务数据且不修改快照', () => {
    const families: SafeChartSpec['family'][] = ['line', 'bar', 'pie', 'combo', 'funnel', 'radar', 'gauge'];
    for (const family of families) {
      const projected = projectGeneratedChartSpec({
        kind: 'chart', schemaVersion: 2, family, fidelity: 'exact',
        option: {
          ...(family === 'radar' ? { radar: { lineWidth: 7 } } : {}),
          visual: {
            series: { itemStyle: { shadowBlur: 12 }, label: { formatter: '{b}: {c}' } },
            root: { tooltip: { formatter: '{b}: {c}' } },
            ...(family === 'radar' ? { coordinate: { splitLine: { lineStyle: { width: 3 } } } } : {}),
          },
        },
      });
      expect(projected.rejectedReason, family).toBeUndefined();
      const definition = buildGeneratedChartDefinition(projected.safeSpec!, 'locked');
      const data = buildChineseMockData(family);
      const doc: ComponentDoc = {
        id: 'test', templateId: 'generated', name: '测试', x: 0, y: 0, w: 400, h: 300,
        zIndex: 0, locked: false, hidden: false, groupId: null, theme: 'dark',
        style: {}, events: [], definitionSnapshot: definition,
      };
      const before = JSON.stringify({ doc, data });
      const rendered = buildSafeChartOption(doc, data);
      const series = rendered.series as Array<Record<string, unknown>>;
      expect(series.length, family).toBeGreaterThan(0);
      for (const item of series) {
        expect(item.itemStyle).toMatchObject({ shadowBlur: 12 });
        expect(item.label).toMatchObject({ formatter: '{b}: {c}' });
        expect(Array.isArray(item.data)).toBe(true);
        expect(family === 'combo' ? ['line', 'bar'] : [family]).toContain(item.type);
      }
      expect(rendered.tooltip).toMatchObject({ renderMode: 'richText', confine: true });
      if (family === 'radar') {
        expect(series[0].lineStyle).toMatchObject({ width: 7 });
        expect(rendered.radar).toMatchObject({ splitLine: { lineStyle: { width: 3 } } });
        const editable = buildGeneratedChartDefinition(projected.safeSpec!, 'editable');
        expect(editable.defaultStyle.dark.lineWidth).toBe(7);
        const editableOption = buildSafeChartOption({ ...doc, definitionSnapshot: editable }, data);
        expect((editableOption.series as Array<Record<string, unknown>>)[0].lineStyle).toMatchObject({ width: 7 });
      }
      expect(JSON.stringify({ doc, data })).toBe(before);
    }
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
