import type { AxisData, ComboData, NameValueData, RadarData } from '@screencraft/shared';
import type { ProtocolKind } from './types';

export type ChartFamily = 'line' | 'bar' | 'combo' | 'pie' | 'funnel' | 'radar' | 'gauge';

/** 从图模板 id 解析族名 */
export function chartFamilyOf(templateId: string): ChartFamily {
  const part = templateId.split('-')[1] ?? 'bar';
  if (part === 'line' || part === 'bar' || part === 'combo' || part === 'pie' || part === 'funnel' || part === 'radar' || part === 'gauge') {
    return part;
  }
  return 'bar';
}

/** 将安全 CSS 颜色转换为指定透明度的 rgba；无法解析时返回 undefined。 */
function withAlpha(color: string, alpha: number): string | undefined {
  const hex = color.trim().match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (hex) {
    const full = hex.length <= 4
      ? hex.split('').map((char) => char + char).join('')
      : hex;
    const red = Number.parseInt(full.slice(0, 2), 16);
    const green = Number.parseInt(full.slice(2, 4), 16);
    const blue = Number.parseInt(full.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${alpha.toFixed(3)})`;
  }
  const rgb = color.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgb) {
    return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha.toFixed(3)})`;
  }
  return undefined;
}

/** 折线面积：顶部按 areaOpacity 着色、底部渐隐，避免大面积实色遮挡网格。 */
function lineAreaStyle(color: string | undefined, opacityPercent: number): Record<string, unknown> | undefined {
  if (!(opacityPercent > 0)) return undefined;
  const opacity = Math.min(opacityPercent, 100) / 100;
  const top = color ? withAlpha(color, Math.min(1, opacity * 0.9 + 0.05)) : undefined;
  const bottom = color ? withAlpha(color, 0.02) : undefined;
  if (!top || !bottom) {
    return { opacity };
  }
  return {
    color: {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: top },
        { offset: 1, color: bottom },
      ],
    },
  };
}

/** 演示提示框对应的类目参考线：模拟截图中悬浮时的 axisPointer。 */
function demoTooltipMarkLine(style: Record<string, unknown>, categories: string[]): Record<string, unknown> | undefined {
  const title = String(style.tooltipTitle ?? '').trim();
  if (!style.showDemoTooltip || !title || !categories.includes(title)) return undefined;
  return {
    silent: true,
    symbol: 'none',
    animation: false,
    label: { show: false },
    lineStyle: { type: 'dashed', width: 1, color: String(style.axisLabelColor ?? '#9FB3D1'), opacity: 0.7 },
    data: [{ xAxis: title }],
  };
}

/** 取不小于 value 的“整齐”上限：1、2、5 × 10^n。 */
function niceCeiling(value: number): number {
  if (!(value > 0)) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const candidate = [1, 2, 5, 10].map((step) => step * magnitude).find((step) => step >= value);
  return candidate ?? value;
}

/** 图例位置 */
function legendOf(style: Record<string, unknown>) {
  const pos = String(style.legendPosition);
  if (pos === 'topRight') {
    return { top: 8, right: 12 };
  }
  if (pos === 'bottom') {
    return { bottom: 0, left: 'center' };
  }
  return { top: 8, left: 'center' };
}

/**
 * 按组件模板默认样式 + mock 数据组装 ECharts option。
 * 编辑器渲染与预览图生成共用，避免左右预览不一致。
 */
export function buildChartOption(input: {
  templateId: string;
  style: Record<string, unknown>;
  data: unknown;
  protocol?: ProtocolKind;
  componentWidth?: number;
  componentHeight?: number;
  pieSummaryKind?: 'alert' | 'control';
  /** 预览图生成：精简图例/轴标签/数值标签，避免缩略图拥挤 */
  forPreview?: boolean;
}): Record<string, unknown> {
  const family = chartFamilyOf(input.templateId);
  const style = input.style;
  const colors = (style.seriesColors as string[]) ?? [];
  const forPreview = Boolean(input.forPreview);

  // 组件高度（已扣除底板标题）较矮时压缩留白并隐藏图例，避免图例压在图形上
  const plotHeight = Number(input.componentHeight ?? 0) > 0 ? Number(input.componentHeight) : 300;
  const shortChart = !forPreview && plotHeight <= 200;
  const tinyChart = !forPreview && plotHeight <= 120;
  // 缩略图只保留图形本身；漏斗保留标签，否则层级几乎分不清
  const showLegend = forPreview || tinyChart ? false : Boolean(style.showLegend);
  const showSeriesLabel = forPreview
    ? family === 'funnel' && Boolean(style.showLabel)
    : Boolean(style.showLabel);
  const axisFont = forPreview ? 10 : shortChart ? 11 : 12;
  const legendOnTop = showLegend && String(style.legendPosition) !== 'bottom';
  const axisGrid = forPreview
    ? { left: 12, right: 12, top: 16, bottom: 12, containLabel: true }
    : shortChart
      ? { left: 8, right: 12, top: legendOnTop ? 30 : 10, bottom: showLegend && !legendOnTop ? 26 : 4, containLabel: true }
      : { left: 48, right: 24, top: legendOnTop ? 40 : 20, bottom: 32 };

  const common = {
    color: colors,
    animation: !forPreview,
    legend: {
      show: showLegend,
      textStyle: { color: style.axisLabelColor, fontSize: 12 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
      ...legendOf(style),
    },
    tooltip: {
      show: !forPreview,
      trigger: family === 'pie' || family === 'funnel' ? 'item' : 'axis',
    },
  };

  if (family === 'line' || family === 'bar') {
    const data = input.data as AxisData;
    const isBar = family === 'bar';
    const horizontal = Boolean(style.horizontal);
    const catAxis = {
      type: 'category' as const,
      data: data.categories,
      show: Boolean(style.showXAxis),
      axisLabel: {
        show: !forPreview,
        color: String(style.axisLabelColor),
        fontSize: axisFont,
      },
      axisTick: { show: !forPreview },
    };
    const valAxis = {
      type: 'value' as const,
      show: Boolean(style.showYAxis),
      axisLabel: {
        show: !forPreview,
        color: String(style.axisLabelColor),
        fontSize: axisFont,
      },
      splitLine: {
        show: !forPreview || Boolean(style.showYAxis),
        lineStyle: { color: String(style.gridColor), type: 'dashed' as const },
      },
      axisTick: { show: false },
    };
    const markLine = !isBar && !horizontal && !forPreview
      ? demoTooltipMarkLine(style, data.categories.map(String))
      : undefined;
    return {
      ...common,
      grid: axisGrid,
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: data.series.map((serie, index) => ({
        name: serie.name,
        type: isBar ? 'bar' : 'line',
        stack: style.stack ? 'total' : undefined,
        smooth: Boolean(style.lineSmooth),
        symbol: forPreview ? (style.showSymbol ? 'circle' : 'none') : style.showSymbol ? 'circle' : 'none',
        symbolSize: forPreview ? 4 : 6,
        barWidth: style.barWidth ? `${style.barWidth}%` : undefined,
        barGap: style.barGap ? `${style.barGap}%` : undefined,
        lineStyle: { width: Number(style.lineWidth ?? 2) },
        label: { show: showSeriesLabel, fontSize: 12 },
        areaStyle: isBar ? undefined : lineAreaStyle(colors[index % Math.max(colors.length, 1)], Number(style.areaOpacity)),
        ...(markLine && index === 0 ? { markLine } : {}),
        data: serie.data,
      })),
    };
  }

  if (family === 'combo') {
    const data = input.data as ComboData;
    const horizontal = Boolean(style.horizontal);
    const categoryAxis = {
      type: 'category',
      data: data.categories,
      show: Boolean(style.showXAxis),
      axisLabel: { show: !forPreview, color: String(style.axisLabelColor), fontSize: axisFont },
      axisTick: { show: !forPreview },
    };
    const valueAxes = [
      {
        type: 'value',
        show: Boolean(style.showYAxis),
        axisLabel: { show: !forPreview, color: String(style.axisLabelColor), fontSize: axisFont },
        splitLine: { lineStyle: { color: String(style.gridColor), type: 'dashed' } },
      },
      { type: 'value', show: Boolean(style.showYAxis) && !forPreview, splitLine: { show: false } },
    ];
    return {
      ...common,
      grid: axisGrid,
      xAxis: horizontal ? valueAxes : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxes,
      series: data.series.map((serie) => {
        const isBar = serie.type === 'bar';
        const isLine = serie.type === 'line';
        return {
          name: serie.name,
          type: serie.type,
          xAxisIndex: horizontal ? (serie.yAxisIndex ?? 0) : undefined,
          yAxisIndex: horizontal ? undefined : (serie.yAxisIndex ?? 0),
          stack: isBar && style.stack ? 'total' : undefined,
          smooth: isLine ? Boolean(style.lineSmooth) : undefined,
          symbol: isLine ? (style.showSymbol ? 'circle' : 'none') : undefined,
          symbolSize: forPreview ? 4 : 6,
          barWidth: isBar && style.barWidth ? `${style.barWidth}%` : undefined,
          lineStyle: isLine ? { width: Number(style.lineWidth ?? 2) } : undefined,
          areaStyle: isLine
            ? lineAreaStyle(colors[data.series.indexOf(serie) % Math.max(colors.length, 1)], Number(style.areaOpacity))
            : undefined,
          data: serie.data,
        };
      }),
    };
  }

  if (family === 'pie') {
    const data = input.data as NameValueData;
    const inner = Number(style.innerRadius ?? 0);
    const hasSideSummary = !forPreview && Boolean(input.pieSummaryKind);
    const showPercentLabel = hasSideSummary && input.pieSummaryKind === 'control';
    const outer = forPreview ? 62 : showPercentLabel ? 54 : hasSideSummary ? 64 : 70;
    // 环宽至少保留外径的 28%，避免内径接近外径时退化成细线
    const minRingWidth = Math.round(outer * 0.28);
    const innerPct = forPreview && inner > 0
      ? Math.min(inner, 48)
      : inner > 0 ? Math.min(inner, outer - minRingWidth) : inner;
    const renderedData = data
      .filter((item) => !(input.pieSummaryKind === 'alert' && item.name === '新增告警' && Number(item.value) === 0))
      .map((item) => {
        const semanticIndex = input.pieSummaryKind === 'alert'
          ? item.name === '已解决' ? 0 : item.name === '未解决' ? 1 : -1
          : input.pieSummaryKind === 'control'
            ? ['算法', '手动', 'PID'].indexOf(item.name)
            : -1;
        return semanticIndex >= 0
          ? { ...item, itemStyle: { color: colors[semanticIndex] } }
          : item;
      });
    return {
      ...common,
      legend: hasSideSummary ? { ...common.legend, show: false } : common.legend,
      series: [
        {
          type: 'pie',
          center: ['50%', '52%'],
          radius: innerPct > 0 ? [`${innerPct}%`, `${outer}%`] : `${outer}%`,
          roseType: style.roseType ? 'radius' : undefined,
          label: showPercentLabel
            ? { show: true, formatter: '{d}%', color: String(style.axisLabelColor), fontSize: 11 }
            : { show: showSeriesLabel, color: String(style.axisLabelColor), fontSize: 10 },
          labelLine: showPercentLabel
            ? { show: true, length: 6, length2: 8, lineStyle: { color: String(style.axisLabelColor), opacity: 0.6 } }
            : { show: showSeriesLabel },
          data: renderedData,
        },
      ],
      graphic:
        style.showCenter && !forPreview
          ? [
              {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: { text: String(style.centerText ?? ''), fill: String(style.axisLabelColor), fontSize: 12 },
              },
            ]
          : style.showCenter && forPreview
            ? [
                {
                  type: 'text',
                  left: 'center',
                  top: 'middle',
                  style: {
                    text: String(style.centerText ?? ''),
                    fill: String(style.axisLabelColor),
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
              ]
            : undefined,
    };
  }

  if (family === 'funnel') {
    const data = input.data as NameValueData;
    const orient = style.funnelOrient === 'horizontal' ? 'horizontal' : 'vertical';
    const sortRaw = String(style.funnelSort ?? 'descending');
    const sort = sortRaw === 'ascending' || sortRaw === 'none' ? sortRaw : 'descending';
    const align = style.funnelAlign === 'left' || style.funnelAlign === 'right' ? style.funnelAlign : 'center';
    const gap = Number(style.funnelGap ?? 2);
    const minSize = `${Number(style.minSize ?? 10)}%`;
    return {
      ...common,
      series: [
        {
          type: 'funnel',
          orient,
          sort,
          funnelAlign: align,
          gap,
          minSize,
          maxSize: '100%',
          left: forPreview ? '6%' : '10%',
          top: forPreview ? 10 : 20,
          bottom: forPreview ? 10 : 20,
          width: forPreview ? (orient === 'horizontal' ? '88%' : '84%') : '80%',
          height: orient === 'horizontal' ? (forPreview ? '70%' : '75%') : undefined,
          label: {
            show: showSeriesLabel,
            position: orient === 'horizontal' ? 'inside' : 'inside',
            fontSize: forPreview ? 9 : 12,
            color: '#fff',
          },
          labelLine: { show: false },
          itemStyle: { borderColor: 'transparent', borderWidth: 0 },
          data,
        },
      ],
    };
  }

  if (family === 'radar') {
    const data = input.data as RadarData;
    const shape = style.radarShape === 'circle' ? 'circle' : 'polygon';
    const splitNumber = Number(style.splitNumber ?? (forPreview ? 3 : 5));
    return {
      ...common,
      radar: {
        indicator: data.indicators,
        center: ['50%', '55%'],
        radius: forPreview ? '62%' : '70%',
        shape,
        splitNumber,
        axisName: {
          show: !forPreview,
          color: String(style.axisLabelColor),
          fontSize: 10,
        },
      },
      series: data.series.map((serie) => ({
        type: 'radar',
        name: serie.name,
        symbol: style.showSymbol ? 'circle' : 'none',
        symbolSize: forPreview ? 4 : 6,
        lineStyle: { width: Number(style.lineWidth ?? 2) },
        areaStyle: Number(style.areaOpacity) > 0 ? { opacity: Number(style.areaOpacity) / 100 } : undefined,
        data: [{ value: serie.data, name: serie.name }],
      })),
    };
  }

  const nv = (input.data as NameValueData) ?? [];
  const value = nv[0]?.value ?? 0;
  const min = Number(style.gaugeMin ?? 0);
  const configuredMax = Number(style.gaugeMax ?? 100);
  // 主值超过量程时（如设备总量 560）自动抬高到整十/整百上限，避免弧线满格
  const max = value > configuredMax ? niceCeiling(value) : configuredMax;
  // 只有量程为 0~100 且值不超过 100 时才视为百分比
  const isPercent = configuredMax === 100 && min === 0 && value <= 100;
  const axisWidth = Number(style.axisLineWidth ?? 14);
  const showPointer = style.showPointer !== false;
  const showProgress = Boolean(style.showProgress);
  const showSplitLine = style.showSplitLine !== false;
  const useZones = Boolean(style.gaugeZones) && colors.length >= 2;
  const shallowGauge = Number(input.componentHeight ?? 0) > 0
    && Number(input.componentHeight) <= 240
    && Number(input.componentWidth ?? 0) / Number(input.componentHeight) >= 1.6;

  /** 轨道配色：分区色带 / 进度弧底轨 / 单色 */
  let axisLineColor: [number, string][];
  if (useZones) {
    axisLineColor = colors.slice(0, 3).map((c, i, arr) => [Number(((i + 1) / arr.length).toFixed(2)), c] as [number, string]);
  } else if (showProgress) {
    const track = String(style.gridColor || 'rgba(159,179,209,.25)');
    axisLineColor = [[1, track]];
  } else {
    axisLineColor = [[1, colors[0] ?? '#2F7FF7']];
  }

  if (shallowGauge) {
    const startAngle = Number(style.gaugeStartAngle ?? 200);
    const endAngle = Number(style.gaugeEndAngle ?? -20);
    const primaryColor = colors[0] ?? '#2F7FF7';
    const pointerColor = colors[1] ?? '#36D3A5';
    const trackColor = String(style.gridColor || 'rgba(80, 104, 142, .42)');
    // 半径按 min(w,h)/2 计算；浅高度下 h 为短边，圆心 82% + 半径 145% 可保证弧顶（含 18px 轨道）不出图表区
    const center: [string, string] = ['50%', '82%'];
    return {
      ...common,
      series: [
        {
          type: 'gauge',
          center,
          radius: '145%',
          startAngle,
          endAngle,
          min,
          max,
          splitNumber: Number(style.splitNumber ?? 10),
          axisLine: { lineStyle: { width: 18, color: [[1, trackColor]] } },
          progress: { show: true, width: 18, itemStyle: { color: primaryColor } },
          pointer: { show: false },
          anchor: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          title: { show: false },
          data: [{ value }],
        },
        {
          type: 'gauge',
          center,
          radius: '112%',
          startAngle,
          endAngle,
          min,
          max,
          splitNumber: Number(style.splitNumber ?? 10),
          axisLine: { lineStyle: { width: 2, color: [[1, 'rgba(100, 124, 160, .45)']] } },
          progress: { show: false },
          pointer: {
            show: showPointer,
            length: '56%',
            width: 5,
            itemStyle: { color: pointerColor },
          },
          anchor: {
            show: showPointer,
            size: 7,
            itemStyle: { color: pointerColor },
          },
          axisTick: {
            show: true,
            splitNumber: 5,
            length: 5,
            distance: 1,
            lineStyle: { color: 'rgba(130, 151, 183, .72)', width: 1 },
          },
          splitLine: {
            show: true,
            length: 9,
            distance: 1,
            lineStyle: { color: 'rgba(160, 178, 204, .75)', width: 1 },
          },
          axisLabel: { show: false },
          detail: {
            show: true,
            formatter: isPercent ? '{value}%' : '{value}',
            color: String(style.valueColor ?? style.axisLabelColor),
            fontSize: 24,
            fontWeight: 600,
            offsetCenter: [0, '-18%'],
          },
          title: {
            show: true,
            color: String(style.axisLabelColor),
            fontSize: 12,
            offsetCenter: [0, '14%'],
          },
          data: [{ value, name: nv[0]?.name ?? '' }],
        },
      ],
    };
  }

  return {
    ...common,
    series: [
      {
        type: 'gauge',
        center: ['50%', forPreview ? '58%' : '55%'],
        radius: forPreview ? '88%' : '90%',
        startAngle: Number(style.gaugeStartAngle ?? 225),
        endAngle: Number(style.gaugeEndAngle ?? -45),
        min,
        max,
        splitNumber: Number(style.splitNumber ?? 10),
        axisLine: {
          lineStyle: {
            width: axisWidth,
            color: axisLineColor,
          },
        },
        progress: {
          show: showProgress,
          width: axisWidth,
          itemStyle: { color: colors[0] ?? '#2F7FF7' },
        },
        pointer: {
          show: showPointer,
          length: '60%',
          width: forPreview ? 4 : 6,
          itemStyle: { color: colors[1] ?? colors[0] ?? '#2F7FF7' },
        },
        anchor: {
          show: showPointer,
          size: forPreview ? 6 : 8,
          itemStyle: { color: colors[1] ?? colors[0] ?? '#2F7FF7' },
        },
        axisTick: { show: showSplitLine && !forPreview },
        splitLine: {
          show: showSplitLine,
          length: forPreview ? 8 : 12,
          lineStyle: { color: String(style.axisLabelColor), width: 1 },
        },
        axisLabel: {
          show: !forPreview && Boolean(style.showLabel !== false),
          color: String(style.axisLabelColor),
          fontSize: 10,
          distance: axisWidth + 4,
        },
        detail: {
          show: Boolean(style.showLabel !== false),
          formatter: '{value}',
          color: String(style.axisLabelColor),
          fontSize: forPreview ? 16 : 20,
          offsetCenter: [0, forPreview ? '24%' : '30%'],
        },
        title: {
          show: !forPreview,
          color: String(style.axisLabelColor),
          offsetCenter: [0, '70%'],
        },
        data: [{ value, name: nv[0]?.name ?? '' }],
      },
    ],
  };
}
