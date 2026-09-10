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
import type { AiBorderAssetsService } from '../ai/ai-border-assets.service';
import type { AiReferenceAssetsService } from '../ai/ai-reference-assets.service';
import type { AiGenerateComponentDto } from '../ai/ai.dto';
import type { AiSettings } from '../ai/ai.schema';
import { AiService } from '../ai/ai.service';
import type { ScreensService } from '../screens/screens.service';
import {
  buildChineseMockData,
  buildGeneratedBorderDefinition,
  buildGeneratedChartDefinition,
  buildGeneratedNineSliceDefinition,
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

  it('v2 可编辑饼图只暴露批准样式，额外视觉参数保留在快照中', () => {
    const projected = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'pie', fidelity: 'exact',
      option: { pie: { innerRadius: 30, outerRadius: 80, centerX: 40, centerY: 60, startAngle: 120, clockwise: false } },
    });
    expect(projected.safeSpec).toBeDefined();
    const definition = buildGeneratedChartDefinition(projected.safeSpec!, 'editable');
    expect(validateComponentDefinitionSnapshot(definition)).toEqual([]);
    for (const theme of ['dark', 'light'] as const) {
      expect(Object.keys(definition.defaultStyle[theme]).sort())
        .toEqual(definition.styleSchema.map((field) => field.key).sort());
      expect(definition.defaultStyle[theme]).toMatchObject({ innerRadius: 30, outerRadius: 80, roseType: 'none' });
      const doc: ComponentDoc = {
        id: 'pie-v2', templateId: 'generated', name: '饼图', x: 0, y: 0, w: 400, h: 300,
        zIndex: 0, locked: false, hidden: false, groupId: null, theme,
        style: { ...definition.defaultStyle[theme] }, events: [], definitionSnapshot: definition,
      };
      expect(buildSafeChartOption(doc, buildChineseMockData('pie')).series).toEqual([
        expect.objectContaining({ center: ['40%', '60%'], startAngle: 120, clockwise: false }),
      ]);
    }
    expect(definition.safeSpec).toEqual(projected.safeSpec);
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
          axisLineWidth: 2, splitLineWidth: 1, axisNameGap: 10, splitAreaColor: 'rgba(47,127,247,0.08)',
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
            axisNameGap: 10,
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

  it('保存样例中的扁平网格描边进入真实 lineStyle，显式嵌套值优先且不改输入', () => {
    for (const [family, target] of [['radar', 'coordinate'], ['line', 'xAxis'], ['bar', 'axis']] as const) {
      const input = {
        kind: 'chart', schemaVersion: 2, family, fidelity: 'exact',
        option: { visual: { [target]: {
          splitLine: { show: true, color: 'rgba(74,127,232,0.25)', width: 1 },
          axisLine: { show: false, color: '#345079', width: 3, lineStyle: { width: 2 } },
        } } },
      };
      const before = JSON.stringify(input);
      const projected = projectGeneratedChartSpec(input);
      expect(projected.warnings).toEqual([]);
      expect(validateSafeChartSpec(projected.safeSpec)).toEqual([]);
      expect(projected.safeSpec?.option.visual?.[target]).toEqual({
        splitLine: { show: true, lineStyle: { color: 'rgba(74,127,232,0.25)', width: 1 } },
        axisLine: { show: false, lineStyle: { color: '#345079', width: 2 } },
      });
      const definition = buildGeneratedChartDefinition(projected.safeSpec!, 'locked');
      const doc: ComponentDoc = {
        id: 'grid-regression', templateId: 'generated', name: '网格回归', x: 0, y: 0, w: 700, h: 360,
        zIndex: 0, locked: false, hidden: false, groupId: null, theme: 'dark',
        style: {}, events: [], definitionSnapshot: definition,
      };
      const rendered = buildSafeChartOption(doc, buildChineseMockData(family));
      expect(family === 'radar' ? rendered.radar : rendered.xAxis).toMatchObject({
        splitLine: { show: true, lineStyle: { color: 'rgba(74,127,232,0.25)', width: 1 } },
      });
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  it('视觉宽度预算与 shared 终检一致，仅截断时提示近似', () => {
    for (const key of ['width', 'lineWidth', 'borderWidth']) {
      for (const value of [-1, 0, 4096, 4097]) {
        const projected = projectGeneratedChartSpec({
          kind: 'chart', schemaVersion: 2, family: 'line', fidelity: 'exact',
          option: { visual: { series: { lineStyle: { [key]: value } } } },
        });
        const clamped = Math.min(4096, Math.max(0, value));
        expect(projected.rejectedReason).toBeUndefined();
        expect(projected.safeSpec?.option.visual?.series).toMatchObject({
          lineStyle: { [key]: clamped },
        });
        expect(validateSafeChartSpec(projected.safeSpec)).toEqual([]);
        expect(validateComponentDefinitionSnapshot(
          buildGeneratedChartDefinition(projected.safeSpec!, 'locked'),
        )).toEqual([]);
        expect(projected.safeSpec?.fidelity).toBe(value === clamped ? 'exact' : 'approximate');
        expect(projected.warnings.length > 0).toBe(value !== clamped);
      }
    }
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

  it('七种图表族投影为合法 v2，200 个快照校验和最终 option 构造低于一秒', () => {
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

    const fixtures = Array.from({ length: 200 }, (_, index) => {
      const family = families[index % families.length];
      const projected = projectGeneratedChartSpec({
        kind: 'chart', schemaVersion: 2, family, fidelity: 'exact',
        option: { visual: { series: { itemStyle: { shadowBlur: 12 } } } },
      });
      expect(projected.safeSpec).toBeDefined();
      const definition = buildGeneratedChartDefinition(projected.safeSpec!, index % 2 ? 'editable' : 'locked');
      const doc: ComponentDoc = {
        id: `perf-${index}`, templateId: 'generated', name: '性能测试', x: 0, y: 0, w: 400, h: 300,
        zIndex: index, locked: false, hidden: false, groupId: null, theme: 'dark',
        style: {}, events: [], definitionSnapshot: definition,
      };
      return { doc, data: buildChineseMockData(family) };
    });
    const startedAt = performance.now();
    const results = fixtures.map(({ doc, data }) => ({
      issues: validateComponentDefinitionSnapshot(doc.definitionSnapshot),
      option: buildSafeChartOption(doc, data),
    }));
    const elapsed = performance.now() - startedAt;
    expect(results).toHaveLength(200);
    for (const result of results) {
      expect(result.issues).toEqual([]);
      expect(Array.isArray(result.option.series)).toBe(true);
      expect((result.option.series as unknown[]).length).toBeGreaterThan(0);
    }
    expect(elapsed).toBeLessThan(1000);
  });

  it('雷达图五层背景填充完整经过投影和快照，独立于数据区域透明度', () => {
    const colors = [
      'rgba(76,120,226,0.55)', 'rgba(66,108,212,0.45)',
      'rgba(56,96,196,0.35)', 'rgba(46,82,174,0.25)', 'rgba(36,66,146,0.15)',
    ];
    const projected = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
      option: {
        radar: { splitNumber: 5, splitAreaColors: colors, areaOpacity: 0.5 },
        visual: { coordinate: { axisLine: { show: false }, splitLine: { show: false } } },
      },
    });
    expect(projected.rejectedReason).toBeUndefined();
    expect(projected.safeSpec?.fidelity).toBe('exact');
    const data = buildChineseMockData('radar');
    for (const mode of ['editable', 'locked'] as const) {
      const definition = buildGeneratedChartDefinition(projected.safeSpec!, mode);
      expect(validateComponentDefinitionSnapshot(definition)).toEqual([]);
      const doc: ComponentDoc = {
        id: 'layered-radar', templateId: 'generated', name: '分层雷达', x: 0, y: 0, w: 400, h: 300,
        zIndex: 0, locked: false, hidden: false, groupId: null, theme: 'dark',
        style: { areaOpacity: 0 }, events: [], definitionSnapshot: definition,
      };
      const before = JSON.stringify({ doc, data });
      const rendered = buildSafeChartOption(JSON.parse(JSON.stringify(doc)) as ComponentDoc, data);
      expect(rendered.radar).toMatchObject({
        splitNumber: 5, splitArea: { show: true, areaStyle: { color: colors } },
        axisLine: { show: false }, splitLine: { show: false },
      });
      const series = rendered.series as Array<Record<string, unknown>>;
      expect(series).toHaveLength((data as { series: unknown[] }).series.length);
      expect(series[0].areaStyle).toMatchObject({ opacity: mode === 'editable' ? 0 : 0.5 });
      expect(JSON.stringify({ doc, data })).toBe(before);
    }
    const hidden = projectGeneratedChartSpec({
      ...projected.safeSpec,
      option: { ...projected.safeSpec!.option, visual: { coordinate: { splitArea: { show: false } } } },
    });
    const definition = buildGeneratedChartDefinition(hidden.safeSpec!, 'locked');
    const doc: ComponentDoc = {
      id: 'plain-radar', templateId: 'generated', name: '无背景雷达', x: 0, y: 0, w: 400, h: 300,
      zIndex: 0, locked: false, hidden: false, groupId: null, theme: 'dark',
      style: {}, events: [], definitionSnapshot: definition,
    };
    expect(buildSafeChartOption(doc, data).radar).toMatchObject({ splitArea: { show: false } });
  });

  it('雷达分区缺省层数跟随多色层数，显式层数和两色交替保持原意', () => {
    for (const count of [2, 8, 12]) {
      const colors = Array.from({ length: count }, (_, index) => `rgba(82,120,224,${(0.6 - index * 0.03).toFixed(2)})`);
      for (const splitNumber of [undefined, 4]) {
        const result = projectGeneratedChartSpec({
          kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
          option: { radar: { splitAreaColors: colors, ...(splitNumber === undefined ? {} : { splitNumber }) } },
        });
        expect(result.warnings).toEqual([]);
        expect(validateSafeChartSpec(result.safeSpec)).toEqual([]);
        expect(result.safeSpec?.option.radar).toMatchObject({
          splitNumber: splitNumber ?? (count > 2 ? count : 5), splitAreaColors: colors,
        });
      }
    }
  });

  it('外圈更实的实色分层会纠正明暗并提亮中心，线框交替与足够亮的正确方向保持原样且不改业务数据', () => {
    const inverted = [
      'rgba(74,127,232,0.04)', 'rgba(74,127,232,0.07)', 'rgba(74,127,232,0.10)',
      'rgba(74,127,232,0.13)', 'rgba(74,127,232,0.16)',
    ];
    const data = buildChineseMockData('radar');
    const input = {
      kind: 'chart' as const,
      schemaVersion: 2 as const,
      family: 'radar' as const,
      fidelity: 'exact' as const,
      option: {
        radar: { splitNumber: 5, splitAreaColors: inverted, areaOpacity: 0.35 },
        visual: {
          coordinate: {
            splitLine: { show: true, color: 'rgba(52,80,121,0.35)', width: 1 },
            axisLine: { show: false },
          },
          series: { areaStyle: { color: 'rgba(47,127,247,0.45)' } },
        },
      },
    };
    const before = JSON.stringify({ input, data });
    const projected = projectGeneratedChartSpec(input);
    expect(projected.rejectedReason).toBeUndefined();
    expect(projected.safeSpec?.fidelity).toBe('approximate');
    expect(projected.warnings.some((item) => item.includes('内外明暗方向'))).toBe(true);
    expect(projected.warnings.some((item) => item.includes('中心过暗'))).toBe(true);
    const colors = projected.safeSpec?.option.radar?.splitAreaColors ?? [];
    expect(colors).toHaveLength(5);
    const alphas = colors.map((color) => Number(/,\s*([\d.]+)\s*\)$/.exec(String(color))?.[1]));
    expect(alphas[0]).toBeGreaterThanOrEqual(0.45);
    expect(alphas[alphas.length - 1]).toBeCloseTo(0.04, 2);
    expect(alphas[0]).toBeGreaterThan(alphas[1]!);
    expect(alphas[1]!).toBeGreaterThan(alphas[alphas.length - 1]!);
    expect(projected.safeSpec?.option.visual?.coordinate).toMatchObject({
      splitLine: { show: true, lineStyle: { color: 'rgba(52,80,121,0.35)', width: 1 } },
      axisLine: { show: false },
    });
    expect(JSON.stringify({ input, data })).toBe(before);

    const bright = [
      'rgba(76,120,226,0.55)', 'rgba(66,108,212,0.45)',
      'rgba(56,96,196,0.35)', 'rgba(46,82,174,0.25)', 'rgba(36,66,146,0.15)',
    ];
    const correct = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
      option: { radar: { splitNumber: 5, splitAreaColors: bright } },
    });
    expect(correct.warnings).toEqual([]);
    expect(correct.safeSpec?.fidelity).toBe('exact');
    expect(correct.safeSpec?.option.radar?.splitAreaColors).toEqual(bright);

    const dimCorrect = [
      'rgba(74,127,232,0.16)', 'rgba(74,127,232,0.13)', 'rgba(74,127,232,0.10)',
      'rgba(74,127,232,0.07)', 'rgba(74,127,232,0.04)',
    ];
    const liftedOnly = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
      option: { radar: { splitAreaColors: dimCorrect } },
    });
    expect(liftedOnly.safeSpec?.fidelity).toBe('approximate');
    expect(liftedOnly.warnings.some((item) => item.includes('中心过暗'))).toBe(true);
    const liftedAlphas = (liftedOnly.safeSpec?.option.radar?.splitAreaColors ?? [])
      .map((color) => Number(/,\s*([\d.]+)\s*\)$/.exec(String(color))?.[1]));
    expect(liftedAlphas[0]).toBeGreaterThanOrEqual(0.45);
    expect(liftedAlphas[liftedAlphas.length - 1]).toBeCloseTo(0.04, 2);

    const alternating = [
      'rgba(47,127,247,0.03)', 'rgba(47,127,247,0.08)',
      'rgba(47,127,247,0.03)', 'rgba(47,127,247,0.08)',
      'rgba(47,127,247,0.03)', 'rgba(47,127,247,0.08)',
    ];
    const wireframe = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
      option: { radar: { splitAreaColors: alternating } },
    });
    expect(wireframe.warnings).toEqual([]);
    expect(wireframe.safeSpec?.fidelity).toBe('exact');
    expect(wireframe.safeSpec?.option.radar?.splitAreaColors).toEqual(alternating);

    const hidden = projectGeneratedChartSpec({
      kind: 'chart', schemaVersion: 2, family: 'radar', fidelity: 'exact',
      option: {
        radar: { splitAreaColors: inverted },
        visual: { coordinate: { splitArea: { show: false } } },
      },
    });
    expect(hidden.safeSpec?.fidelity).toBe('exact');
    expect(hidden.safeSpec?.option.radar?.splitAreaColors).toEqual(inverted);
  });

  it('可编辑折线和组合图按实例透明度启停填充，保留渐变', () => {
    for (const family of ['line', 'combo'] as const) {
      for (const initialOpacity of [0, 0.5]) {
        const result = projectGeneratedChartSpec({
          kind: 'chart', schemaVersion: 2, family, fidelity: 'exact',
          option: { line: { areaOpacity: initialOpacity } },
        });
        const definition = buildGeneratedChartDefinition(result.safeSpec!, 'editable');
        for (const areaOpacity of [0, 60]) {
          const doc: ComponentDoc = {
            id: 'area-toggle', templateId: 'generated', name: '面积填充', x: 0, y: 0, w: 400, h: 300,
            zIndex: 0, locked: false, hidden: false, groupId: null, theme: 'dark',
            style: { areaOpacity }, events: [], definitionSnapshot: definition,
          };
          const rendered = buildSafeChartOption(doc, buildChineseMockData(family));
          const lines = (rendered.series as Array<Record<string, unknown>>).filter((item) => item.type === 'line');
          expect(lines.length).toBeGreaterThan(0);
          for (const line of lines) {
            if (areaOpacity === 0) expect(line.areaStyle).toBeUndefined();
            else expect(line.areaStyle).toMatchObject({ opacity: 0.6, color: { type: 'linear', colorStops: expect.any(Array) } });
          }
        }
      }
    }
  });

  it('七族视觉扩展进入最终渲染 option，保留业务数据且不修改快照', () => {
    const families: SafeChartSpec['family'][] = ['line', 'bar', 'pie', 'combo', 'funnel', 'radar', 'gauge'];
    for (const family of families) {
      const projected = projectGeneratedChartSpec({
        kind: 'chart', schemaVersion: 2, family, fidelity: 'exact',
        option: {
          ...(family === 'radar' ? { radar: { lineWidth: 7 } } : {}),
          visual: {
            series: {
              itemStyle: {
                shadowBlur: 12, opacity: 0.65,
                color: { type: 'linear', direction: 'horizontal', stops: [
                  { offset: 0, color: 'rgba(82,120,224,0.8)' }, { offset: 1, color: '#587FE8' },
                ] },
              },
              label: { formatter: '{b}: {c}' },
            },
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
        expect(item.itemStyle).toMatchObject({
          shadowBlur: 12, opacity: 0.65,
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [
            { offset: 0, color: 'rgba(82,120,224,0.8)' }, { offset: 1, color: '#587FE8' },
          ] },
        });
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
    expect(payload.messages[0].content).toContain('禁止函数、HTML、CSS、SVG/path 原文、外部 URL');
  });

  it('有参考图时可将九宫格边框转存永久资产并注入 assetId', async () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(64, 16);
    png.writeUInt32BE(64, 20);
    const referenceAssets = {
      readOwned: vi.fn(async () => ({ mimeType: 'image/png', buffer: png })),
    } as unknown as AiReferenceAssetsService;
    const borderAssets = {
      saveFromBuffer: vi.fn(async () => ({
        _id: 'border-asset-9',
        mimeType: 'image/png',
        size: png.length,
        width: 64,
        height: 64,
        url: '/uploads/border-assets/border-asset-9.png',
      })),
    } as unknown as AiBorderAssetsService;
    const service = createService({ referenceAssets, borderAssets });
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          name: '科技边框图',
          theme: 'dark',
          styleMode: 'editable',
          safeSpec: {
            kind: 'nineSlice',
            schemaVersion: 1,
            slice: { top: 24, right: 24, bottom: 24, left: 24 },
          },
          warnings: ['右下角水印无法精确去除'],
          unsupportedFeatures: [],
        }) } }],
      },
    });

    const result = await service.generateComponent({
      ...createRequest(),
      kind: 'border',
      referenceAssetId: 'ref-1',
      instruction: '按参考图生成九宫格边框',
    }, 'user-1');

    expect(borderAssets.saveFromBuffer).toHaveBeenCalled();
    expect(result.definitionSnapshot).toMatchObject({
      rendererKey: 'border-nine-slice-v1',
      category: 'decoration',
      group: 'border',
      safeSpec: {
        kind: 'nineSlice',
        assetId: 'border-asset-9',
        slice: { top: 24, right: 24, bottom: 24, left: 24 },
      },
    });
    expect(result.style).toMatchObject({
      assetUrl: '/uploads/border-assets/border-asset-9.png',
      sliceTop: 24,
    });
    expect(result.fidelity).toBe('approximate');
    expect(validateComponentDefinitionSnapshot(result.definitionSnapshot)).toEqual([]);
  });

  it('拒绝九宫格中的外部 URL assetId', () => {
    const definition = buildGeneratedNineSliceDefinition({
      kind: 'nineSlice',
      schemaVersion: 1,
      assetId: 'https://evil.example/x.png',
      slice: { top: 8, right: 8, bottom: 8, left: 8 },
    }, '/uploads/border-assets/x.png');
    expect(validateComponentDefinitionSnapshot(definition)
      .some((item) => item.message.includes('禁止使用外部 URL'))).toBe(true);
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

  it('九宫格批准字段完整通过快照校验', () => {
    const definition = buildGeneratedNineSliceDefinition({
      kind: 'nineSlice',
      schemaVersion: 1,
      assetId: 'asset-ok',
      slice: { top: 16, right: 16, bottom: 16, left: 16 },
    }, '/uploads/border-assets/asset-ok.png');
    expect(validateComponentDefinitionSnapshot(definition)).toEqual([]);
    expect(definition.styleSchema.map((field) => field.key)).toEqual(expect.arrayContaining([
      'sliceTop', 'sliceRight', 'sliceBottom', 'sliceLeft', 'contentPadding', 'assetUrl',
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

function createService(overrides?: {
  referenceAssets?: AiReferenceAssetsService;
  borderAssets?: AiBorderAssetsService;
}): AiService {
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
  const referenceAssets = overrides?.referenceAssets
    ?? { readOwned: vi.fn() } as unknown as AiReferenceAssetsService;
  const borderAssets = overrides?.borderAssets ?? {
    saveFromBuffer: vi.fn(async () => ({
      _id: 'border-asset-1',
      mimeType: 'image/png',
      size: 24,
      width: 64,
      height: 64,
      url: '/uploads/border-assets/border-asset-1.png',
    })),
    assertOwnedIds: vi.fn(async () => undefined),
  } as unknown as AiBorderAssetsService;
  return new AiService({} as never, settingsModel, config, screens, referenceAssets, borderAssets);
}
