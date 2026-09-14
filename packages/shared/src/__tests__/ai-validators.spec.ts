import { describe, expect, it } from 'vitest';
import {
  buildAiEditorDraft,
  getBuiltinComponentMetadata,
  validateAiEditorPlanResponse,
  validateAiScreenAnalysisResult,
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

const chartSpecV2: SafeChartSpec = {
  kind: 'chart',
  schemaVersion: 2,
  family: 'radar',
  fidelity: 'exact',
  option: {
    palette: ['#2F7FF7', '#35E0FF'],
    backgroundColor: 'transparent',
    legend: {
      show: true,
      position: 'right',
      orientation: 'vertical',
      icon: 'diamond',
      itemWidth: 14,
      itemHeight: 10,
      gap: 12,
      textColor: '#B8CAE6',
      textSize: 12,
    },
    radar: {
      shape: 'polygon',
      splitNumber: 5,
      centerX: 46,
      centerY: 54,
      radius: 72,
      areaOpacity: 0.24,
      axisNameColor: '#DCE8FF',
      axisNameSize: 13,
      axisLineColor: '#345079',
      splitLineColor: '#2F527F',
      splitAreaColors: ['rgba(47,127,247,0.03)', 'rgba(47,127,247,0.08)'],
      symbol: 'diamond',
      symbolSize: 6,
      lineWidth: 3,
      label: {
        show: false,
        position: 'top',
        color: '#F5FAFF',
        fontSize: 12,
        fontWeight: 'bold',
        distance: 8,
      },
    },
  },
};

const borderStyle = {
  cornerType: borderSpec.cornerType,
  cornerSize: borderSpec.cornerSize,
  primaryColor: borderSpec.primaryColor,
  accentColor: borderSpec.accentColor,
  backgroundColor: borderSpec.backgroundColor,
  lineWidth: borderSpec.lineWidth,
  lineOpacity: borderSpec.lineOpacity,
  innerGlow: borderSpec.innerGlow,
  outerGlow: borderSpec.outerGlow,
  glowOpacity: borderSpec.glowOpacity,
  titlePosition: borderSpec.titlePosition,
  contentPadding: borderSpec.contentPadding,
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

const borderSnapshot: ComponentDefinitionSnapshot = {
  source: 'generated',
  rendererKey: 'border-parametric-v1',
  specVersion: 1,
  category: 'decoration',
  group: 'border',
  defaultSize: { w: 720, h: 420 },
  styleSchema: [
    {
      key: 'cornerType', label: '角标类型', type: 'select', group: '角标', aiWritable: true,
      options: [
        { label: '切角', value: 'cut' }, { label: '括角', value: 'bracket' },
        { label: '缺口', value: 'notch' }, { label: '线角', value: 'line' },
      ],
    },
    { key: 'cornerSize', label: '角标尺寸', type: 'number', min: 0, max: 160, group: '角标', aiWritable: true },
    { key: 'primaryColor', label: '主色', type: 'color', group: '颜色', aiWritable: true },
    { key: 'accentColor', label: '强调色', type: 'color', group: '颜色', aiWritable: true },
    { key: 'backgroundColor', label: '背景色与透明度', type: 'color', group: '颜色', aiWritable: true },
    { key: 'lineWidth', label: '线宽', type: 'number', min: 0, max: 24, group: '边线', aiWritable: true },
    { key: 'lineOpacity', label: '边线透明度', type: 'number', min: 0, max: 1, group: '边线', aiWritable: true },
    { key: 'innerGlow', label: '内发光', type: 'number', min: 0, max: 64, group: '发光', aiWritable: true },
    { key: 'outerGlow', label: '外发光', type: 'number', min: 0, max: 64, group: '发光', aiWritable: true },
    { key: 'glowOpacity', label: '发光透明度', type: 'number', min: 0, max: 1, group: '发光', aiWritable: true },
    {
      key: 'titlePosition', label: '标题位置', type: 'select', group: '布局', aiWritable: true,
      options: [
        { label: '不显示', value: 'none' },
        { label: '左上', value: 'topLeft' },
        { label: '顶部居中', value: 'topCenter' },
      ],
    },
    { key: 'contentPadding', label: '内容内边距', type: 'number', min: 0, max: 160, group: '布局', aiWritable: true },
  ],
  styleMode: 'editable',
  defaultStyle: {
    dark: { ...borderStyle },
    light: { ...borderStyle },
  },
  safeSpec: borderSpec,
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

describe('整屏截图能力测试结构', () => {
  const result = {
    canvas: { width: 1920, height: 1080, backgroundColor: '#061226' },
    ignoredRegions: [
      { bounds: { x: 0, y: 0, w: 1920, h: 60 }, reason: '应用导航栏' },
    ],
    components: [
      {
        order: 1,
        type: 'line',
        name: '用汽趋势',
        bounds: { x: 40, y: 100, w: 900, h: 420 },
        title: '用汽趋势',
        visibleTexts: ['用汽趋势', '本月', '上月'],
        seriesCount: 2,
        confidence: 0.96,
        notes: '',
      },
    ],
    warnings: [],
  };

  it('接受合法的整屏拆分结果', () => {
    expect(validateAiScreenAnalysisResult(result)).toEqual([]);
  });

  it('接受页面背景层诊断并拒绝未知类型、资产字段、空描述和越界范围', () => {
    const backgroundLayer = {
      kind: 'interactiveScene',
      bounds: { x: 0, y: 60, w: 1920, h: 1020 },
      description: '园区全景背景图',
      confidence: 0.95,
      notes: '定位标记是否独立交互无法从截图确认',
    };
    expect(validateAiScreenAnalysisResult({
      ...result,
      canvas: { ...result.canvas, backgroundLayer },
    })).toEqual([]);

    const issues = validateAiScreenAnalysisResult({
      ...result,
      canvas: {
        ...result.canvas,
        backgroundLayer: {
          ...backgroundLayer,
          kind: 'webglScene',
          bounds: { x: 0, y: 60, w: 1920, h: 1200 },
          description: '',
          confidence: 2,
          url: 'https://example.com/background.png',
        },
      },
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '$.canvas.backgroundLayer.kind', message: '背景层类型不在允许范围内' }),
      expect.objectContaining({ path: '$.canvas.backgroundLayer.url', message: '字段不在白名单中' }),
      expect.objectContaining({ path: '$.canvas.backgroundLayer.bounds', message: expect.stringContaining('超出画布') }),
      expect.objectContaining({ path: '$.canvas.backgroundLayer.description' }),
      expect.objectContaining({ path: '$.canvas.backgroundLayer.confidence' }),
    ]));
  });

  it('报告背景控制栏重复识别和图表误并入 KPI', () => {
    const issues = validateAiScreenAnalysisResult({
      ...result,
      canvas: {
        ...result.canvas,
        backgroundLayer: {
          kind: 'interactiveScene',
          bounds: { x: 300, y: 60, w: 1300, h: 1020 },
          description: '三维园区场景',
          confidence: 0.95,
          notes: '包含定位与视角控制',
        },
      },
      components: [
        {
          ...result.components[0],
          type: 'kpiList',
          title: '',
          seriesCount: 0,
          notes: '含柱状对比与数值指标，合并为 kpiList',
        },
        {
          ...result.components[0],
          order: 2,
          type: 'unsupported',
          name: '底部视角控制栏',
          bounds: { x: 700, y: 1010, w: 700, h: 60 },
          title: '',
          visibleTexts: ['1X', '播放倍率', '视角漫游', '隐藏面板', '后台视频'],
          seriesCount: 0,
          notes: '归入背景层交互能力',
        },
      ],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('KPI 内包含独立图表') }),
      expect.objectContaining({ message: expect.stringContaining('背景层交互控制栏') }),
    ]));
  });

  it('报告可确定并入同名主体的游离面板标题', () => {
    const issues = validateAiScreenAnalysisResult({
      ...result,
      components: [
        {
          order: 1,
          type: 'text',
          name: '运行工况标题',
          bounds: { x: 1400, y: 100, w: 150, h: 30 },
          title: '运行工况',
          visibleTexts: ['运行工况'],
          seriesCount: 0,
          confidence: 0.95,
          notes: '',
        },
        {
          order: 2,
          type: 'table',
          name: '运行工况表格',
          bounds: { x: 1400, y: 130, w: 400, h: 200 },
          title: '',
          visibleTexts: ['设备', '报警内容'],
          seriesCount: 0,
          confidence: 0.9,
          notes: '',
        },
      ],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('游离面板标题') }),
    ]));
  });

  it('报告图表吞并两项以上独立汇总 KPI', () => {
    const issues = validateAiScreenAnalysisResult({
      ...result,
      components: [{
        ...result.components[0],
        visibleTexts: ['能源态势', '314 t', '当日碳排放', '31,476 t', '累计碳排放'],
      }],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('图表疑似吞并') }),
    ]));
  });

  it('对复用完全相同边界的拆分组件给出明确问题', () => {
    const issues = validateAiScreenAnalysisResult({
      ...result,
      components: [
        {
          ...result.components[0],
          order: 1,
          type: 'kpi',
          name: '年化产量',
          title: '',
          visibleTexts: ['5 GW', '年化产量'],
          seriesCount: 0,
        },
        {
          ...result.components[0],
          order: 2,
          type: 'bar',
          name: '月单产对比',
          title: '',
          visibleTexts: ['170kg/天', '180kg/天'],
          seriesCount: 2,
        },
      ],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('使用完全相同的 bounds') }),
    ]));
  });

  it('允许 32 个组件，空数组或第 33 个组件超过硬上限', () => {
    const components = Array.from({ length: 32 }, (_, index) => ({
      ...result.components[0],
      order: index + 1,
      name: `组件${index + 1}`,
      type: 'kpi',
      bounds: { x: index * 2, y: 100, w: 1, h: 1 },
      title: '',
      visibleTexts: [],
      seriesCount: 0,
    }));
    expect(validateAiScreenAnalysisResult({ ...result, components })).toEqual([]);
    expect(validateAiScreenAnalysisResult({ ...result, components: [] })).toContainEqual({
      path: '$.components',
      message: 'components 必须是包含 1~32 项的数组',
    });
    expect(validateAiScreenAnalysisResult({
      ...result,
      components: [...components, { ...components[0], order: 33, name: '组件33', bounds: { x: 64, y: 100, w: 1, h: 1 } }],
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '$.components', message: 'components 必须是包含 1~32 项的数组' }),
    ]));
  });

  it('拒绝未知类型、重复顺序和越界坐标', () => {
    const invalid = {
      ...result,
      components: [
        { ...result.components[0], type: 'map', bounds: { x: 1800, y: 100, w: 400, h: 420 } },
        { ...result.components[0], name: '重复组件' },
      ],
    };
    const issues = validateAiScreenAnalysisResult(invalid);
    expect(issues.some((item) => item.path.endsWith('.type'))).toBe(true);
    expect(issues.some((item) => item.message.includes('order 不能重复'))).toBe(true);
    expect(issues.some((item) => item.message.includes('超出画布'))).toBe(true);
  });

  it('报告按列排序、组件大面积重叠、虚构标题和饼图系列数误用', () => {
    const semanticInvalid = {
      ...result,
      components: [
        { ...result.components[0], order: 1, bounds: { x: 40, y: 500, w: 900, h: 420 } },
        {
          ...result.components[0],
          order: 2,
          type: 'pie',
          name: '告警处理率',
          bounds: { x: 540, y: 100, w: 500, h: 300 },
          title: '模型概括标题',
          visibleTexts: ['已解决', '未解决'],
          seriesCount: 3,
        },
        {
          ...result.components[0],
          order: 3,
          type: 'kpiList',
          name: '告警指标',
          bounds: { x: 560, y: 110, w: 200, h: 160 },
          title: '',
          visibleTexts: ['今日告警'],
          seriesCount: 0,
        },
      ],
    };
    const issues = validateAiScreenAnalysisResult(semanticInvalid);
    expect(issues.some((item) => item.message.includes('禁止按整列'))).toBe(true);
    expect(issues.some((item) => item.message.includes('重叠超过'))).toBe(true);
    expect(issues.some((item) => item.message.includes('title 必须来自'))).toBe(true);
    expect(issues.some((item) => item.message.includes('seriesCount 表示图表系列数'))).toBe(true);
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
    expect(validateSafeChartSpec(chartSpecV2)).toEqual([]);
    expect(validateSafeBorderSpec(borderSpec)).toEqual([]);
  });

  it('校验 v2 渐变、百分比范围和图表族完整字段', () => {
    const gradientLine: SafeChartSpec = {
      kind: 'chart',
      schemaVersion: 2,
      family: 'line',
      fidelity: 'exact',
      option: {
        line: {
          smooth: true,
          width: 3,
          lineType: 'solid',
          areaOpacity: 0.3,
          areaColor: {
            type: 'linear',
            direction: 'vertical',
            stops: [{ offset: 0, color: '#35E0FF' }, { offset: 1, color: 'rgba(47,127,247,0)' }],
          },
          symbol: 'circle',
          symbolSize: 6,
          label: { show: true, position: 'top', color: '#fff', fontSize: 12, fontWeight: 'normal', distance: 8 },
        },
      },
    };
    expect(validateSafeChartSpec(gradientLine)).toEqual([]);

    const invalid = clone(chartSpecV2) as Extract<SafeChartSpec, { schemaVersion: 2 }>;
    invalid.option.radar!.radius = 101;
    expect(validateSafeChartSpec(invalid).some((item) => item.path === '$.option.radar.radius')).toBe(true);
  });

  it('接受通用安全视觉扩展、文本 formatter 与受限 path', () => {
    const visualChart: SafeChartSpec = {
      kind: 'chart',
      schemaVersion: 2,
      family: 'line',
      fidelity: 'exact',
      option: {
        line: {
          smooth: true,
          width: 3,
          lineType: 'solid',
          areaOpacity: 0.3,
          areaColor: '#2F7FF7',
          symbol: 'circle',
          symbolSize: 6,
          label: { show: false, position: 'top', color: '#fff', fontSize: 12, fontWeight: 'normal', distance: 8 },
        },
        visual: {
          root: { animationDuration: 300, tooltip: { renderMode: 'richText', formatter: '{b}: {c}' } },
          series: {
            symbol: 'path://M0 0 L10 0 L5 10 Z',
            itemStyle: { shadowBlur: 20, shadowColor: 'rgba(47,127,247,0.4)' },
          },
        },
      },
    };
    expect(validateSafeChartSpec(visualChart)).toEqual([]);
  });

  it('拒绝视觉扩展中的数据注入、HTML formatter、外部资源和性能越界', () => {
    const baseVisual = {
      ...chartSpecV2,
      option: { ...chartSpecV2.option },
    } as Extract<SafeChartSpec, { schemaVersion: 2 }>;

    const unsafeCases = [
      { series: { data: [1, 2, 3] } },
      { series: { label: { formatter: '<b>{c}</b>' } } },
      { series: { label: { formatter: 12 } } },
      { series: { type: 'custom' } },
      { series: { symbol: 'path://M Z' } },
      { series: { symbol: 'path://M0 0 A10 10 0 2 0 20 20' } },
      { series: { itemStyle: { color: { image: '//example.com/a.png' } } } },
      { series: { symbol: 'image://https://example.com/icon.png' } },
      { root: { animationDuration: 60_000 } },
    ];
    unsafeCases.forEach((visual) => {
      const candidate = { ...baseVisual, option: { ...baseVisual.option, visual } };
      expect(validateSafeChartSpec(candidate).length).toBeGreaterThan(0);
    });
  });

  it('拒绝函数入口、外部地址与未知字段', () => {
    const unsafeChart = clone(chartSpec) as unknown as Record<string, unknown>;
    const option = unsafeChart.option as Record<string, unknown>;
    option.formatter = 'javascript:alert(1)';
    expect(validateSafeChartSpec(unsafeChart).some((item) => item.path === '$.option.formatter')).toBe(true);

    const unsafeBorder = { ...borderSpec, rawSvg: '<svg><script /></svg>' };
    expect(validateSafeBorderSpec(unsafeBorder).some((item) => item.path === '$.rawSvg')).toBe(true);

    const functionChart = clone(chartSpec) as unknown as { option: { line: Record<string, unknown> } };
    functionChart.option.line.smooth = () => true;
    expect(validateSafeChartSpec(functionChart).some((item) => item.path === '$.option.line.smooth')).toBe(true);

    for (const key of ['renderItem', 'html', 'css', 'svg'] as const) {
      const unsafe = clone(chartSpec) as unknown as { option: Record<string, unknown> };
      unsafe.option[key] = key === 'renderItem' ? 'return null' : `<${key}>unsafe</${key}>`;
      expect(validateSafeChartSpec(unsafe).some((item) => item.path === `$.option.${key}`)).toBe(true);
    }

    const urlChart = clone(chartSpec);
    urlChart.option.palette = ['https://example.com/theme.css'];
    expect(validateSafeChartSpec(urlChart).some((item) => item.path === '$.option.palette[0]')).toBe(true);
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
    expect(validateComponentDefinitionSnapshot({
      ...snapshot,
      group: 'radar',
      dataProtocol: 'radar',
      styleMode: 'locked',
      styleSchema: [],
      defaultStyle: { dark: {}, light: {} },
      safeSpec: chartSpecV2,
    })).toEqual([]);
  });

  it('完整快照按 safeSpec 自身深度预算接受深层渐变', () => {
    const gradientSpec = clone(chartSpecV2) as Extract<SafeChartSpec, { schemaVersion: 2 }>;
    gradientSpec.option.visual = {
      series: {
        itemStyle: {
          color: {
            type: 'linear',
            direction: 'vertical',
            stops: [
              { offset: 0, color: 'rgba(47,127,247,0.8)' },
              { offset: 1, color: 'rgba(47,127,247,0)' },
            ],
          },
        },
      },
    };
    const gradientSnapshot: ComponentDefinitionSnapshot = {
      ...clone(snapshot),
      group: 'radar',
      dataProtocol: 'radar',
      styleMode: 'locked',
      styleSchema: [],
      defaultStyle: { dark: {}, light: {} },
      safeSpec: gradientSpec,
    };
    expect(validateSafeChartSpec(gradientSpec)).toEqual([]);
    expect(validateComponentDefinitionSnapshot(gradientSnapshot)).toEqual([]);
  });

  it('独立计算 safeSpec 深度后仍拒绝超深结构和危险键，并保留完整错误路径', () => {
    let nested: Record<string, unknown> = {};
    for (let index = 0; index < 10; index += 1) nested = { next: nested };
    for (const field of ['safeSpec', 'defaultStyle'] as const) {
      const issues = validateComponentDefinitionSnapshot({ ...snapshot, [field]: nested });
      expect(issues.some((item) => item.path.startsWith(`$.${field}.`)
        && item.message.includes('对象深度'))).toBe(true);
    }
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const dangerous = JSON.parse(`{"${key}":{"polluted":true}}`) as Record<string, unknown>;
      for (const field of ['safeSpec', 'defaultStyle'] as const) {
        const issues = validateComponentDefinitionSnapshot({ ...snapshot, [field]: dangerous });
        expect(issues.some((item) => item.path === `$.${field}.${key}`
          && item.message.includes('危险字段'))).toBe(true);
      }
      expect(validateComponentDefinitionSnapshot({ ...snapshot, ...dangerous })
        .some((item) => item.path === `$.${key}` && item.message.includes('危险字段'))).toBe(true);
    }
  });

  it('接受参数化边框快照并拒绝伪造字段与越界实例样式', () => {
    expect(validateComponentDefinitionSnapshot(borderSnapshot)).toEqual([]);

    const forged = clone(borderSnapshot);
    forged.styleSchema.push({
      key: 'rawSvg', label: '原始 SVG', type: 'text', group: '边框', aiWritable: true,
    });
    expect(validateComponentDefinitionSnapshot(forged)
      .some((item) => item.message.includes('参数化边框批准目录'))).toBe(true);

    expect(validateAiStylePatch(borderSnapshot.styleSchema, { cornerSize: 161, rawSvg: '<svg />' })
      .map((item) => item.path)).toEqual(expect.arrayContaining(['$.cornerSize', '$.rawSvg']));
  });

  it('接受已启用的九宫格快照，并在显式关闭时拒绝', () => {
    const mismatched = clone(snapshot);
    mismatched.group = 'bar';
    mismatched.styleMode = 'locked';
    expect(validateComponentDefinitionSnapshot(mismatched).length).toBeGreaterThan(0);

    const nineSlice = {
      ...clone(snapshot),
      rendererKey: 'border-nine-slice-v1' as const,
      category: 'decoration' as const,
      group: 'border' as const,
      dataProtocol: undefined,
      styleSchema: [
        { key: 'sliceTop', label: '上切', type: 'number', min: 0, max: 4096, group: '切片', aiWritable: true },
        { key: 'sliceRight', label: '右切', type: 'number', min: 0, max: 4096, group: '切片', aiWritable: true },
        { key: 'sliceBottom', label: '下切', type: 'number', min: 0, max: 4096, group: '切片', aiWritable: true },
        { key: 'sliceLeft', label: '左切', type: 'number', min: 0, max: 4096, group: '切片', aiWritable: true },
        { key: 'contentPadding', label: '内容边距', type: 'number', min: 0, max: 160, group: '布局', aiWritable: true },
        { key: 'assetUrl', label: '边框图', type: 'text', group: '资源', aiWritable: false, readOnly: true },
      ],
      styleMode: 'editable' as const,
      defaultStyle: {
        dark: { sliceTop: 12, sliceRight: 12, sliceBottom: 12, sliceLeft: 12, contentPadding: 16, assetUrl: '/uploads/border-assets/a.png' },
        light: { sliceTop: 12, sliceRight: 12, sliceBottom: 12, sliceLeft: 12, contentPadding: 16, assetUrl: '/uploads/border-assets/a.png' },
      },
      safeSpec: { kind: 'nineSlice', schemaVersion: 1, assetId: 'asset-1', slice: { top: 12, right: 12, bottom: 12, left: 12 } },
    };
    expect(validateComponentDefinitionSnapshot(nineSlice)).toEqual([]);
    expect(validateComponentDefinitionSnapshot(nineSlice, { allowNineSlice: false })
      .some((item) => item.message.includes('尚未启用'))).toBe(true);

    const unknownRenderer = { ...clone(snapshot), rendererKey: 'custom-script-renderer' };
    expect(validateComponentDefinitionSnapshot(unknownRenderer).some((item) => item.path === '$.rendererKey')).toBe(true);
  });

  it('拒绝客户端伪造样式字段目录和错误的图表数据协议', () => {
    const forgedSchema = clone(snapshot);
    forgedSchema.styleSchema.push({
      key: 'formatter', label: '格式化', type: 'text', group: '系列', aiWritable: true,
    });
    expect(validateComponentDefinitionSnapshot(forgedSchema)
      .some((item) => item.message.includes('批准目录'))).toBe(true);

    const wrongProtocol = clone(snapshot);
    wrongProtocol.dataProtocol = 'nameValue';
    expect(validateComponentDefinitionSnapshot(wrongProtocol)
      .some((item) => item.path === '$.dataProtocol')).toBe(true);
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

    pages[0].components[0] = {
      ...component,
      style: { formatter: 'javascript:alert(1)' },
      definitionSnapshot: snapshot,
    };
    expect(validatePageComponentDefinitions(pages)
      .some((item) => item.path.endsWith('.style.formatter'))).toBe(true);
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
