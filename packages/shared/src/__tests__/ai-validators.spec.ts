import { describe, expect, it } from 'vitest';
import {
  getBuiltinComponentMetadata,
  validateAiEditorPlanResponse,
  validateAiStylePatch,
  validateComponentDefinitionSnapshot,
  validatePageComponentDefinitions,
  validateSafeBorderSpec,
  validateSafeChartSpec,
} from '../index';
import type { ComponentDefinitionSnapshot, PageDoc, SafeBorderSpec, SafeChartSpec } from '../types';

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
