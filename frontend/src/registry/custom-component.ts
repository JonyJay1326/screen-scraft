import type { ComponentDefinitionSnapshot } from '@screencraft/shared';

/** 个人预设不持有业务数据；添加实例时按已声明协议生成中文演示数据。 */
export function createCustomMockData(definition: ComponentDefinitionSnapshot): unknown {
  if (definition.dataProtocol === 'axis') {
    return {
      categories: ['一月', '二月', '三月', '四月', '五月', '六月'],
      series: [
        { name: '计划值', data: [82, 95, 108, 116, 132, 145] },
        { name: '实际值', data: [76, 102, 101, 128, 139, 152] },
      ],
    };
  }
  if (definition.dataProtocol === 'combo') {
    return {
      categories: ['一月', '二月', '三月', '四月', '五月', '六月'],
      series: [
        { name: '产量', type: 'bar', data: [86, 92, 105, 118, 126, 140] },
        { name: '完成率', type: 'line', yAxisIndex: 1, data: [78, 84, 91, 96, 102, 108] },
      ],
    };
  }
  if (definition.dataProtocol === 'radar') {
    return {
      indicators: [
        { name: '效率', max: 100 }, { name: '质量', max: 100 }, { name: '安全', max: 100 },
        { name: '成本', max: 100 }, { name: '交付', max: 100 },
      ],
      series: [{ name: '综合评分', data: [86, 92, 95, 78, 89] }],
    };
  }
  if (definition.group === 'gauge') {
    return [{ name: '完成率', value: 86 }];
  }
  return [
    { name: '华东区域', value: 42 },
    { name: '华南区域', value: 31 },
    { name: '华北区域', value: 24 },
    { name: '西部区域', value: 18 },
  ];
}
