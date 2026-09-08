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
  /** 预览图生成：精简图例/轴标签/数值标签，避免缩略图拥挤 */
  forPreview?: boolean;
}): Record<string, unknown> {
  const family = chartFamilyOf(input.templateId);
  const style = input.style;
  const colors = (style.seriesColors as string[]) ?? [];
  const forPreview = Boolean(input.forPreview);

  // 缩略图只保留图形本身；漏斗保留标签，否则层级几乎分不清
  const showLegend = forPreview ? false : Boolean(style.showLegend);
  const showSeriesLabel = forPreview
    ? family === 'funnel' && Boolean(style.showLabel)
    : Boolean(style.showLabel);
  const axisFont = forPreview ? 10 : 12;
  const axisGrid = forPreview
    ? { left: 12, right: 12, top: 16, bottom: 12, containLabel: true }
    : { left: 48, right: 24, top: 40, bottom: 32 };

  const common = {
    color: colors,
    animation: !forPreview,
    legend: {
      show: showLegend,
      textStyle: { color: style.axisLabelColor, fontSize: 12 },
      itemWidth: 14,
      itemHeight: 10,
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
    return {
      ...common,
      grid: axisGrid,
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      series: data.series.map((serie) => ({
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
        areaStyle:
          !isBar && Number(style.areaOpacity) > 0 ? { opacity: Number(style.areaOpacity) / 100 } : undefined,
        data: serie.data,
      })),
    };
  }

  if (family === 'combo') {
    const data = input.data as ComboData;
    return {
      ...common,
      grid: axisGrid,
      xAxis: {
        type: 'category',
        data: data.categories,
        show: Boolean(style.showXAxis),
        axisLabel: { show: !forPreview, color: String(style.axisLabelColor), fontSize: axisFont },
        axisTick: { show: !forPreview },
      },
      yAxis: [
        {
          type: 'value',
          show: Boolean(style.showYAxis),
          axisLabel: { show: !forPreview, color: String(style.axisLabelColor), fontSize: axisFont },
          splitLine: { lineStyle: { color: String(style.gridColor), type: 'dashed' } },
        },
        { type: 'value', show: Boolean(style.showYAxis) && !forPreview, splitLine: { show: false } },
      ],
      series: data.series.map((serie) => {
        const isBar = serie.type === 'bar';
        const isLine = serie.type === 'line';
        return {
          name: serie.name,
          type: serie.type,
          yAxisIndex: serie.yAxisIndex ?? 0,
          stack: isBar && style.stack ? 'total' : undefined,
          smooth: isLine ? Boolean(style.lineSmooth) : undefined,
          symbol: isLine ? (style.showSymbol ? 'circle' : 'none') : undefined,
          symbolSize: forPreview ? 4 : 6,
          barWidth: isBar && style.barWidth ? `${style.barWidth}%` : undefined,
          lineStyle: isLine ? { width: Number(style.lineWidth ?? 2) } : undefined,
          areaStyle:
            isLine && Number(style.areaOpacity) > 0 ? { opacity: Number(style.areaOpacity) / 100 } : undefined,
          data: serie.data,
        };
      }),
    };
  }

  if (family === 'pie') {
    const data = input.data as NameValueData;
    const inner = Number(style.innerRadius ?? 0);
    const outer = forPreview ? 62 : 70;
    const innerPct = forPreview && inner > 0 ? Math.min(inner, 48) : inner;
    return {
      ...common,
      series: [
        {
          type: 'pie',
          center: ['50%', '52%'],
          radius: innerPct > 0 ? [`${innerPct}%`, `${outer}%`] : `${outer}%`,
          roseType: style.roseType ? 'radius' : undefined,
          label: { show: showSeriesLabel, color: String(style.axisLabelColor), fontSize: 10 },
          labelLine: { show: showSeriesLabel },
          data,
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
  const max = Number(style.gaugeMax ?? 100);
  const axisWidth = Number(style.axisLineWidth ?? 14);
  const showPointer = style.showPointer !== false;
  const showProgress = Boolean(style.showProgress);
  const showSplitLine = style.showSplitLine !== false;
  const useZones = Boolean(style.gaugeZones) && colors.length >= 2;

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
