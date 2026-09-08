import { getBuiltinComponentMetadata } from '@screencraft/shared';
import type { ComponentTemplate } from '../../types';

const sharedMetadata = getBuiltinComponentMetadata('chart-line-1');
if (!sharedMetadata) {
  throw new Error('内置组件缺少 shared 元数据：chart-line-1');
}

export const chartLine1Template: Omit<ComponentTemplate, 'renderer'> = {
  id: 'chart-line-1',
  category: 'chart',
  group: '折线图',
  label: '折线图·样式1',
  previews: { dark: 'previews/chart-line-1.dark.svg', light: 'previews/chart-line-1.light.svg' },
  defaultSize: { w: 700, h: 300 },
  dataProtocol: 'axis',
  hasDataTab: true,
  hasEventTab: true,
  styleSchema: sharedMetadata.styleSchema,
  defaultStyle: {
    dark: {
      boardEnabled: true,
      boardTitle: '折线图',
      boardPadding: 12,
      seriesColors: ['#2F7FF7', '#35E0FF', '#22C55E', '#F59E0B', '#EF4444', '#A78BFA', '#F472B6', '#34D399'],
      lineSmooth: true,
      lineWidth: 2,
      areaOpacity: 20,
      showSymbol: true,
      showLabel: false,
      showLegend: true,
      legendPosition: 'top',
      showXAxis: true,
      showYAxis: true,
      axisLabelColor: '#9FB3D1',
      gridColor: 'rgba(30,58,102,.6)',
    },
    light: {
      boardEnabled: true,
      boardTitle: '折线图',
      boardPadding: 12,
      seriesColors: ['#2F7FF7', '#0EA5E9', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#059669'],
      lineSmooth: true,
      lineWidth: 2,
      areaOpacity: 15,
      showSymbol: true,
      showLabel: false,
      showLegend: true,
      legendPosition: 'top',
      showXAxis: true,
      showYAxis: true,
      axisLabelColor: '#6B7280',
      gridColor: 'rgba(228,231,237,.9)',
    },
  },
  defaultData: {
    categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
    series: [
      { name: '供水量', data: [820, 932, 901, 1290, 1330, 1520] },
      { name: '售水量', data: [700, 810, 780, 1100, 1180, 1360] },
    ],
  },
};
