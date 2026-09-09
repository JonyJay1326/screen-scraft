import { describe, expect, it } from 'vitest';
import {
  buildAiEditorDraft,
  getBuiltinComponentMetadata,
  validateAiEditorPlanResponse,
  validateAiStylePatch,
  validateComponentDefinitionSnapshot,
  validatePageComponentDefinitions,
  validateSafeBorderSpec,
  validateSafeChartSpec,
} from '../index';
import type {
  AiEditorPlanRequest,
  AiEditorPlanResponse,
  ComponentDefinitionSnapshot,
  PageDoc,
  SafeBorderSpec,
  SafeChartSpec,
  ScreenDoc,
} from '../types';

const chartSpec: SafeChartSpec = {
  kind: 'chart',
  schemaVersion: 1,
  family: 'line',
  option: {
    grid: { left: 48, right: 24, top: 40, bottom: 32 },
    palette: ['#2F7FF7', 'rgba(53,224,255,.8)'],
    legend: { show: true, position: 'top' },
    axis: { showX: true, showY: true, labelColor: '#9FB3D1', gridColor: 'rgba(30,58,102,.6)' },
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
  backgroundColor: 'rgba(6,18,38,.8)',
  lineWidth: 2,
  lineOpacity: 0.9,
  innerGlow: 8,
  outerGlow: 14,
  glowOpacity: 0.45,
  titlePosition: 'topLeft',
  contentPadding: 16,
};

const snapshot: ComponentDefinitionSnapshot = {
  source: 'generated',
  rendererKey: 'echarts-safe-v1',
  specVersion: 1,
  category: 'chart',
  group: 'line',
  dataProtocol: 'axis',
  defaultSize: { w: 700, h: 300 },
  styleSchema: [
    { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列', aiWritable: true },
    { key: 'lineWidth', label: '线宽', type: 'number', min: 1, max: 6, step: 0.5, group: '系列', aiWritable: true },
  ],
  styleMode: 'editable',
  defaultStyle: {
    dark: { seriesColors: ['#2F7FF7'], lineWidth: 3 },
    light: { seriesColors: ['#0EA5E9'], lineWidth: 3 },
  },
  safeSpec: chartSpec,
};

describe('内置组件共享元数据', () => {
  it('前后端可按模板读取同一份 aiWritable 白名单', () => {
    const metadata = getBuiltinComponentMetadata('chart-line-1');
    expect(metadata?.dataProtocol).toBe('axis');
    expect(metadata?.styleSchema.find((item) => item.key === 'lineWidth')?.aiWritable).toBe(true);
    expect(metadata?.styleSchema.find((item) => item.key === 'boardTitle')?.aiWritable).toBe(false);
  });

  it('未知模板默认拒绝', () => {
    expect(getBuiltinComponentMetadata('unknown-template')).toBeUndefined();
  });
});

describe('AI 样式补丁', () => {
  const schema = getBuiltinComponentMetadata('chart-line-1')?.styleSchema ?? [];

  it('接受声明且可写的合法字段', () => {
    expect(validateAiStylePatch(schema, { lineWidth: 4, showLegend: false, seriesColors: ['#2F7FF7'] })).toEqual([]);
  });

  it('拒绝未声明、只读和越界字段', () => {
    const issues = validateAiStylePatch(schema, { boardTitle: '篡改标题', lineWidth: 99, formatter: 'x' });
    expect(issues.map((item) => item.path)).toEqual(expect.arrayContaining(['$.boardTitle', '$.lineWidth', '$.formatter']));
  });
});

describe('AI 修改方案结构', () => {
  const plan = {
    planId: 'plan-1',
    summary: '隐藏图例并调整线宽',
    operations: [{ targetType: 'component', targetId: 'c1', stylePatch: { showLegend: false, lineWidth: 4 } }],
    skipped: [],
    unsupportedFeatures: [],
    warnings: [],
    editorRevision: 3,
  };

  it('接受合法的组件样式方案', () => {
    expect(validateAiEditorPlanResponse(plan)).toEqual([]);
  });

  it('拒绝危险字段、未知操作和越界页面透明度', () => {
    const dangerous = JSON.parse(JSON.stringify(plan).replace(
      '"lineWidth":4',
      '"__proto__":{"polluted":true}',
    )) as unknown;
    expect(validateAiEditorPlanResponse(dangerous).some((item) => item.message.includes('危险字段'))).toBe(true);
    expect(validateAiEditorPlanResponse({ ...plan, operations: [{ targetType: 'delete', targetId: 'c1' }] }).length)
      .toBeGreaterThan(0);
    expect(validateAiEditorPlanResponse({
      ...plan,
      operations: [{ targetType: 'page', targetId: 'p1', backgroundPatch: { opacity: 101 } }],
    }).some((item) => item.path.endsWith('.opacity'))).toBe(true);
  });
});

describe('AI 预览草稿', () => {
  it('200 组件整屏方案在一秒内完成校验与草稿构造，且不修改正式状态', () => {
    const components = Array.from({ length: 200 }, (_, index) => ({
      id: `c${index + 1}`,
      templateId: 'chart-line-1',
      name: `趋势图 ${index + 1}`,
      x: 0,
      y: index * 4,
      w: 480,
      h: 260,
      zIndex: index + 1,
      locked: false,
      hidden: false,
      groupId: null,
      theme: 'dark' as const,
      style: { lineWidth: 2 },
      events: [],
    }));
    const screen: ScreenDoc = {
      _id: 'screen-1',
      projectId: 'project-1',
      name: '性能测试大屏',
      category: '通用',
      deployed: false,
      fitMode: 'center',
      canvas: { width: 1920, height: 1080 },
      pages: [{
        id: 'page-1',
        name: '页面 1',
        parentId: null,
        background: { type: 'normal', color: '#0D1730', opacity: 100, fill: 'cover' },
        components,
      }],
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
    };
    const request: AiEditorPlanRequest = {
      screenId: screen._id,
      pageId: 'page-1',
      scope: 'screen',
      componentIds: components.map((component) => component.id),
      instruction: '统一整屏色板',
      editorRevision: 8,
      context: {
        pageBackground: { color: '#0D1730', opacity: 100 },
        components: components.map(({ id, templateId, name, theme, locked, hidden, style }) => ({
          id, templateId, name, theme, locked, hidden, style,
        })),
      },
    };
    const plan: AiEditorPlanResponse = {
      planId: 'screen-plan',
      summary: '统一整屏色板',
      operations: [
        { targetType: 'page', targetId: 'page-1', backgroundPatch: { color: '#08152D', opacity: 92 } },
        ...components.map((component) => ({
          targetType: 'component' as const,
          targetId: component.id,
          stylePatch: { lineWidth: 4 },
        })),
      ],
      skipped: [],
      unsupportedFeatures: [],
      warnings: [],
      editorRevision: 8,
    };

    const startedAt = performance.now();
    const result = buildAiEditorDraft(screen, plan, request, 8);
    const elapsedMs = performance.now() - startedAt;

    expect(result.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(1000);
    expect(screen.pages[0].components[0].style.lineWidth).toBe(2);
    if (result.ok) {
      expect(result.screen.pages[0].components).toHaveLength(200);
      expect(result.screen.pages[0].components[199].style.lineWidth).toBe(4);
      expect(result.screen.pages[0].background.color).toBe('#08152D');
    }
  });

  it('拒绝超出请求边界的目标', () => {
    const screen = createScreenForBoundaryTest();
    const request: AiEditorPlanRequest = {
      screenId: screen._id,
      pageId: 'page-1',
      scope: 'page',
      componentIds: [],
      instruction: '修改背景',
      editorRevision: 1,
      context: { pageBackground: { color: '#0D1730', opacity: 100 }, components: [] },
    };
    const plan: AiEditorPlanResponse = {
      planId: 'bad-boundary',
      summary: '越界修改',
      operations: [{ targetType: 'page', targetId: 'page-2', backgroundPatch: { opacity: 80 } }],
      skipped: [],
      unsupportedFeatures: [],
      warnings: [],
      editorRevision: 1,
    };
    expect(buildAiEditorDraft(screen, plan, request, 1)).toEqual({
      ok: false,
      error: '页面 page-2 不在本次 AI 修改范围内',
    });
  });
});

describe('安全 renderer 描述', () => {
  it('接受合法图表和边框描述', () => {
    expect(validateSafeChartSpec(chartSpec)).toEqual([]);
    expect(validateSafeBorderSpec(borderSpec)).toEqual([]);
  });

  it('拒绝函数入口、外部地址与未知字段', () => {
    const unsafeChart = clone(chartSpec) as unknown as Record<string, unknown>;
    const option = unsafeChart.option as Record<string, unknown>;
    option.formatter = 'javascript:alert(1)';
    expect(validateSafeChartSpec(unsafeChart).some((item) => item.path === '$.option.formatter')).toBe(true);

    const unsafeBorder = { ...borderSpec, rawSvg: '<svg><script /></svg>' };
    expect(validateSafeBorderSpec(unsafeBorder).some((item) => item.path === '$.rawSvg')).toBe(true);
  });

  it('拒绝危险键、过深对象和超长数组', () => {
    const dangerous = JSON.parse('{"kind":"chart","schemaVersion":1,"family":"line","option":{"__proto__":{"polluted":true}}}') as unknown;
    expect(validateSafeChartSpec(dangerous).some((item) => item.message.includes('危险字段'))).toBe(true);

    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let index = 0; index < 10; index += 1) {
      deep.next = {};
      deep = deep.next as Record<string, unknown>;
    }
    expect(validateSafeChartSpec({ ...chartSpec, option: root }).some((item) => item.message.includes('对象深度'))).toBe(true);
    expect(validateSafeChartSpec({ ...chartSpec, option: { palette: Array(65).fill('#fff') } }).some((item) => item.message.includes('数组长度'))).toBe(true);
  });
});

describe('组件定义快照', () => {
  it('接受自包含的安全图表快照', () => {
    expect(validateComponentDefinitionSnapshot(snapshot)).toEqual([]);
  });

  it('拒绝 renderer 与描述不匹配、锁定模式可写和未启用九宫格', () => {
    const mismatched = clone(snapshot);
    mismatched.group = 'bar';
    mismatched.styleMode = 'locked';
    expect(validateComponentDefinitionSnapshot(mismatched).length).toBeGreaterThan(0);

    const nineSlice = {
      ...clone(snapshot),
      rendererKey: 'border-nine-slice-v1',
      category: 'decoration',
      group: 'border',
      dataProtocol: undefined,
      styleSchema: [],
      styleMode: 'locked',
      defaultStyle: { dark: {}, light: {} },
      safeSpec: { kind: 'nineSlice', schemaVersion: 1, assetId: 'asset-1', slice: { top: 12, right: 12, bottom: 12, left: 12 } },
    };
    expect(validateComponentDefinitionSnapshot(nineSlice).some((item) => item.message.includes('尚未启用'))).toBe(true);
  });

  it('保存大屏时要求 custom 组件携带合法快照', () => {
    const component = {
      id: 'c1',
      templateId: 'custom:test',
      name: 'AI 折线图',
      x: 0,
      y: 0,
      w: 700,
      h: 300,
      zIndex: 1,
      locked: false,
      hidden: false,
      groupId: null,
      theme: 'dark' as const,
      style: {},
      events: [],
    };
    const pages: PageDoc[] = [{
      id: 'p1',
      name: '页面1',
      parentId: null,
      background: { type: 'normal' as const, color: '#000000', opacity: 100, fill: 'cover' as const },
      components: [component],
    }];
    expect(validatePageComponentDefinitions(pages).some((item) => item.message.includes('必须包含定义快照'))).toBe(true);
    pages[0].components[0] = { ...component, definitionSnapshot: snapshot };
    expect(validatePageComponentDefinitions(pages)).toEqual([]);
  });
});

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createScreenForBoundaryTest(): ScreenDoc {
  const background = { type: 'normal' as const, color: '#0D1730', opacity: 100, fill: 'cover' as const };
  return {
    _id: 'screen-1',
    projectId: 'project-1',
    name: '边界测试大屏',
    category: '通用',
    deployed: false,
    fitMode: 'center',
    canvas: { width: 1920, height: 1080 },
    pages: [
      { id: 'page-1', name: '页面 1', parentId: null, background: { ...background }, components: [] },
      { id: 'page-2', name: '页面 2', parentId: null, background: { ...background }, components: [] },
    ],
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
  };
}
