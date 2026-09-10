import type {
  ComponentDefinitionSnapshot,
  ProtocolKind,
  SafeBorderSpec,
  SafeChartSpec,
  StyleField,
} from '@screencraft/shared';

const DARK_PALETTE = ['#2F7FF7', '#35E0FF', '#7C5CFC', '#22C55E', '#F59E0B'];
const LIGHT_PALETTE = ['#2F7FF7', '#0EA5E9', '#7C3AED', '#16A34A', '#D97706'];

const legendPositionOptions = [
  { label: '顶部', value: 'top' },
  { label: '右上', value: 'topRight' },
  { label: '底部', value: 'bottom' },
  { label: '左侧', value: 'left' },
  { label: '右侧', value: 'right' },
];

export function buildGeneratedChartDefinition(
  spec: SafeChartSpec,
  styleMode: 'editable' | 'locked',
): ComponentDefinitionSnapshot {
  const styleSchema = styleMode === 'editable' ? approvedStyleSchema(spec.family) : [];
  return {
    source: 'generated',
    rendererKey: 'echarts-safe-v1',
    specVersion: 1,
    category: 'chart',
    group: spec.family,
    dataProtocol: protocolForFamily(spec.family),
    defaultSize: defaultSizeForFamily(spec.family),
    styleSchema,
    styleMode,
    defaultStyle: styleMode === 'editable'
      ? {
          dark: defaultStyle(spec, 'dark'),
          light: defaultStyle(spec, 'light'),
        }
      : { dark: {}, light: {} },
    safeSpec: spec,
  };
}

export function buildGeneratedBorderDefinition(spec: SafeBorderSpec): ComponentDefinitionSnapshot {
  const styleSchema = approvedBorderStyleSchema();
  const defaultStyle = borderDefaultStyle(spec);
  return {
    source: 'generated',
    rendererKey: 'border-parametric-v1',
    specVersion: 1,
    category: 'decoration',
    group: 'border',
    defaultSize: { w: 720, h: 420 },
    styleSchema,
    styleMode: 'editable',
    defaultStyle: {
      dark: { ...defaultStyle },
      light: { ...defaultStyle },
    },
    safeSpec: spec,
  };
}

export function buildChineseMockData(family: SafeChartSpec['family']): unknown {
  if (family === 'line' || family === 'bar') {
    return {
      categories: ['一月', '二月', '三月', '四月', '五月', '六月'],
      series: [
        { name: '计划值', data: [82, 95, 108, 116, 132, 145] },
        { name: '实际值', data: [76, 102, 101, 128, 139, 152] },
      ],
    };
  }
  if (family === 'combo') {
    return {
      categories: ['一月', '二月', '三月', '四月', '五月', '六月'],
      series: [
        { name: '产量', type: 'bar', data: [86, 92, 105, 118, 126, 140] },
        { name: '完成率', type: 'line', yAxisIndex: 1, data: [78, 84, 91, 96, 102, 108] },
      ],
    };
  }
  if (family === 'radar') {
    return {
      indicators: [
        { name: '效率', max: 100 },
        { name: '质量', max: 100 },
        { name: '安全', max: 100 },
        { name: '成本', max: 100 },
        { name: '交付', max: 100 },
      ],
      series: [{ name: '综合评分', data: [86, 92, 95, 78, 89] }],
    };
  }
  if (family === 'gauge') {
    return [{ name: '完成率', value: 86 }];
  }
  return [
    { name: '华东区域', value: 42 },
    { name: '华南区域', value: 31 },
    { name: '华北区域', value: 24 },
    { name: '西部区域', value: 18 },
  ];
}

function protocolForFamily(family: SafeChartSpec['family']): ProtocolKind {
  if (family === 'line' || family === 'bar') {
    return 'axis';
  }
  if (family === 'combo') {
    return 'combo';
  }
  if (family === 'radar') {
    return 'radar';
  }
  return 'nameValue';
}

function defaultSizeForFamily(family: SafeChartSpec['family']): { w: number; h: number } {
  return family === 'gauge' ? { w: 420, h: 320 } : { w: 700, h: 360 };
}

function approvedStyleSchema(family: SafeChartSpec['family']): StyleField[] {
  const fields: StyleField[] = [
    { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列', aiWritable: true },
    { key: 'showLegend', label: '显示图例', type: 'switch', group: '图例', aiWritable: true },
    {
      key: 'legendPosition', label: '图例位置', type: 'select', options: legendPositionOptions,
      group: '图例', aiWritable: true,
    },
  ];
  if (family === 'line' || family === 'bar' || family === 'combo') {
    fields.push(
      { key: 'showXAxis', label: '显示横轴', type: 'switch', group: '坐标轴', aiWritable: true },
      { key: 'showYAxis', label: '显示纵轴', type: 'switch', group: '坐标轴', aiWritable: true },
      { key: 'axisLabelColor', label: '轴文字颜色', type: 'color', group: '坐标轴', aiWritable: true },
      { key: 'gridColor', label: '网格线颜色', type: 'color', group: '坐标轴', aiWritable: true },
    );
  }
  if (family === 'line' || family === 'combo' || family === 'radar') {
    fields.push(
      { key: 'lineWidth', label: '线宽', type: 'number', min: 1, max: 20, step: 0.5, unit: 'px', group: '系列', aiWritable: true },
      { key: 'areaOpacity', label: '面积透明度', type: 'number', min: 0, max: 100, step: 1, unit: '%', group: '系列', aiWritable: true },
      { key: 'showSymbol', label: '显示数据点', type: 'switch', group: '系列', aiWritable: true },
    );
  }
  if (family === 'line' || family === 'combo') {
    fields.push({ key: 'lineSmooth', label: '平滑曲线', type: 'switch', group: '系列', aiWritable: true });
  }
  if (family === 'bar' || family === 'combo') {
    fields.push(
      { key: 'barWidth', label: '柱宽', type: 'number', min: 1, max: 100, step: 1, unit: '%', group: '系列', aiWritable: true },
      { key: 'barRadius', label: '柱圆角', type: 'number', min: 0, max: 50, step: 1, unit: 'px', group: '系列', aiWritable: true },
      { key: 'stack', label: '堆叠显示', type: 'switch', group: '系列', aiWritable: true },
      { key: 'horizontal', label: '水平排列', type: 'switch', group: '系列', aiWritable: true },
    );
  }
  if (family === 'pie') {
    fields.push(
      { key: 'innerRadius', label: '内环比例', type: 'number', min: 0, max: 99, step: 1, unit: '%', group: '饼图', aiWritable: true },
      { key: 'outerRadius', label: '外环比例', type: 'number', min: 1, max: 100, step: 1, unit: '%', group: '饼图', aiWritable: true },
      {
        key: 'roseType', label: '玫瑰模式', type: 'select', group: '饼图', aiWritable: true,
        options: [{ label: '关闭', value: 'none' }, { label: '半径', value: 'radius' }, { label: '面积', value: 'area' }],
      },
    );
  }
  if (family === 'radar') {
    fields.push(
      {
        key: 'radarShape', label: '雷达形状', type: 'select', group: '雷达', aiWritable: true,
        options: [{ label: '多边形', value: 'polygon' }, { label: '圆形', value: 'circle' }],
      },
      { key: 'splitNumber', label: '分隔层数', type: 'number', min: 2, max: 12, step: 1, group: '雷达', aiWritable: true },
    );
  }
  if (family === 'funnel') {
    fields.push(
      {
        key: 'funnelSort', label: '排序', type: 'select', group: '漏斗', aiWritable: true,
        options: [{ label: '升序', value: 'ascending' }, { label: '降序', value: 'descending' }, { label: '不排序', value: 'none' }],
      },
      {
        key: 'funnelAlign', label: '对齐', type: 'select', group: '漏斗', aiWritable: true,
        options: [{ label: '左', value: 'left' }, { label: '居中', value: 'center' }, { label: '右', value: 'right' }],
      },
      { key: 'funnelGap', label: '间距', type: 'number', min: 0, max: 64, step: 1, unit: 'px', group: '漏斗', aiWritable: true },
    );
  }
  if (family === 'gauge') {
    fields.push(
      { key: 'gaugeMin', label: '最小值', type: 'number', min: -1_000_000, max: 1_000_000, step: 1, group: '仪表盘', aiWritable: true },
      { key: 'gaugeMax', label: '最大值', type: 'number', min: -1_000_000, max: 1_000_000, step: 1, group: '仪表盘', aiWritable: true },
      { key: 'gaugeStartAngle', label: '起始角度', type: 'number', min: -360, max: 360, step: 1, unit: '°', group: '仪表盘', aiWritable: true },
      { key: 'gaugeEndAngle', label: '结束角度', type: 'number', min: -360, max: 360, step: 1, unit: '°', group: '仪表盘', aiWritable: true },
      { key: 'showPointer', label: '显示指针', type: 'switch', group: '仪表盘', aiWritable: true },
      { key: 'showProgress', label: '显示进度', type: 'switch', group: '仪表盘', aiWritable: true },
    );
  }
  return fields;
}

function approvedBorderStyleSchema(): StyleField[] {
  return [
    {
      key: 'cornerType', label: '角标类型', type: 'select', group: '角标', aiWritable: true,
      options: [
        { label: '切角', value: 'cut' },
        { label: '括角', value: 'bracket' },
        { label: '缺口', value: 'notch' },
        { label: '线角', value: 'line' },
      ],
    },
    { key: 'cornerSize', label: '角标尺寸', type: 'number', min: 0, max: 160, step: 1, unit: 'px', group: '角标', aiWritable: true },
    { key: 'primaryColor', label: '主色', type: 'color', group: '颜色', aiWritable: true },
    { key: 'accentColor', label: '强调色', type: 'color', group: '颜色', aiWritable: true },
    { key: 'backgroundColor', label: '背景色与透明度', type: 'color', group: '颜色', aiWritable: true },
    { key: 'lineWidth', label: '线宽', type: 'number', min: 0, max: 24, step: 0.5, unit: 'px', group: '边线', aiWritable: true },
    { key: 'lineOpacity', label: '边线透明度', type: 'number', min: 0, max: 1, step: 0.05, group: '边线', aiWritable: true },
    { key: 'innerGlow', label: '内发光', type: 'number', min: 0, max: 64, step: 1, unit: 'px', group: '发光', aiWritable: true },
    { key: 'outerGlow', label: '外发光', type: 'number', min: 0, max: 64, step: 1, unit: 'px', group: '发光', aiWritable: true },
    { key: 'glowOpacity', label: '发光透明度', type: 'number', min: 0, max: 1, step: 0.05, group: '发光', aiWritable: true },
    {
      key: 'titlePosition', label: '标题位置', type: 'select', group: '布局', aiWritable: true,
      options: [
        { label: '不显示', value: 'none' },
        { label: '左上', value: 'topLeft' },
        { label: '顶部居中', value: 'topCenter' },
      ],
    },
    { key: 'contentPadding', label: '内容内边距', type: 'number', min: 0, max: 160, step: 1, unit: 'px', group: '布局', aiWritable: true },
  ];
}

function borderDefaultStyle(spec: SafeBorderSpec): Record<string, unknown> {
  return {
    cornerType: spec.cornerType,
    cornerSize: spec.cornerSize,
    primaryColor: spec.primaryColor,
    accentColor: spec.accentColor,
    backgroundColor: spec.backgroundColor,
    lineWidth: spec.lineWidth,
    lineOpacity: spec.lineOpacity,
    innerGlow: spec.innerGlow,
    outerGlow: spec.outerGlow,
    glowOpacity: spec.glowOpacity,
    titlePosition: spec.titlePosition,
    contentPadding: spec.contentPadding,
  };
}

function defaultStyle(spec: SafeChartSpec, theme: 'dark' | 'light'): Record<string, unknown> {
  const option = spec.option;
  const palette = option.palette?.length ? option.palette : theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  const style: Record<string, unknown> = {
    seriesColors: palette,
    showLegend: option.legend?.show ?? true,
    legendPosition: option.legend?.position ?? 'top',
  };
  if (spec.family === 'line' || spec.family === 'bar' || spec.family === 'combo') {
    Object.assign(style, {
      showXAxis: option.axis?.showX ?? true,
      showYAxis: option.axis?.showY ?? true,
      axisLabelColor: option.axis?.labelColor ?? (theme === 'dark' ? '#9FB3D1' : '#5B6B82'),
      gridColor: option.axis?.gridColor ?? (theme === 'dark' ? '#23395D' : '#DCE6F2'),
    });
  }
  if (option.line) {
    Object.assign(style, {
      lineSmooth: option.line.smooth,
      lineWidth: option.line.width,
      areaOpacity: option.line.areaOpacity * 100,
      showSymbol: option.line.symbol !== 'none',
    });
  }
  if (option.bar) {
    Object.assign(style, {
      barWidth: option.bar.width,
      barRadius: option.bar.radius,
      stack: option.bar.stack,
      horizontal: option.bar.horizontal,
    });
  }
  if (option.pie) {
    Object.assign(style, {
      innerRadius: option.pie.innerRadius,
      outerRadius: option.pie.outerRadius,
      roseType: option.pie.roseType,
    });
  }
  if (option.radar) {
    Object.assign(style, {
      radarShape: option.radar.shape,
      splitNumber: option.radar.splitNumber,
      areaOpacity: option.radar.areaOpacity * 100,
      lineWidth: spec.schemaVersion === 2 ? spec.option.radar?.lineWidth ?? 2 : 2,
      showSymbol: spec.schemaVersion === 2 ? spec.option.radar?.symbol !== 'none' : true,
    });
  }
  if (option.funnel) {
    Object.assign(style, {
      funnelSort: option.funnel.sort,
      funnelAlign: option.funnel.align,
      funnelGap: option.funnel.gap,
    });
  }
  if (option.gauge) {
    Object.assign(style, {
      gaugeMin: option.gauge.min,
      gaugeMax: option.gauge.max,
      gaugeStartAngle: option.gauge.startAngle,
      gaugeEndAngle: option.gauge.endAngle,
      showPointer: option.gauge.showPointer,
      showProgress: option.gauge.showProgress,
    });
  }
  return style;
}
