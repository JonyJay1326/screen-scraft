import type { ProtocolKind } from '@screencraft/shared';

export type MockRegion = { code: string; name: string };

export type MockDataset = {
  regions: MockRegion[];
  daily: Array<{
    metricDate: string;
    dayLabel: string;
    region: string;
    sales: number;
    orders: number;
    visitors: number;
    conversionRate: number;
    energyKwh: number;
  }>;
  categories: Array<{ region: string; category: string; sortOrder: number; sales: number }>;
  channels: Array<{ region: string; channel: string; sortOrder: number; visitors: number }>;
  radar: Array<{ region: string; indicator: string; sortOrder: number; score: number; maxValue: number }>;
  funnel: Array<{ region: string; stage: string; sortOrder: number; value: number }>;
  alerts: Array<{
    region: string;
    deviceCode: string;
    deviceName: string;
    level: string;
    status: string;
    occurredAt: string;
  }>;
};

export type MockApiConfigSeed = {
  name: string;
  mockKey: string;
  protocol: ProtocolKind;
  params: { name: string; type: 'string' | 'number'; defaultValue?: unknown }[];
};

export type MockDatasetSeed = {
  key: string;
  protocol: ProtocolKind;
  defaultData?: unknown;
  variants: Array<{ params: Record<string, string | number>; data: unknown }>;
};

export const MOCK_REGIONS: MockRegion[] = [
  { code: 'east', name: '华东' },
  { code: 'south', name: '华南' },
  { code: 'north', name: '华北' },
  { code: 'west', name: '西南' },
];

const round = (value: number, digits = 0): number => Number(value.toFixed(digits));

/** 生成确定性、缓慢变化的演示业务数据。 */
export function createMockDataset(anchorDate = new Date()): MockDataset {
  const daily: MockDataset['daily'] = [];
  const categories: MockDataset['categories'] = [];
  const channels: MockDataset['channels'] = [];
  const radar: MockDataset['radar'] = [];
  const funnel: MockDataset['funnel'] = [];
  const alerts: MockDataset['alerts'] = [];
  const normalizedAnchor = new Date(Date.UTC(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate(),
  ));

  MOCK_REGIONS.forEach((region, regionIndex) => {
    const regionFactor = 1 + regionIndex * 0.07;
    for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
      const date = new Date(normalizedAnchor);
      date.setUTCDate(date.getUTCDate() - (29 - dayIndex));
      const smoothFactor = 1 + dayIndex * 0.0025
        + Math.sin((dayIndex + regionIndex) / 4.5) * 0.022
        + Math.cos((dayIndex + regionIndex * 2) / 8) * 0.012;
      const sales = round(118_000 * regionFactor * smoothFactor, 2);
      const conversionRate = round(3.62 + regionIndex * 0.08 + Math.sin((dayIndex + 2) / 6) * 0.12, 2);
      const orders = Math.round((1_280 * regionFactor) * smoothFactor);
      const visitors = Math.round(orders / (conversionRate / 100));
      daily.push({
        metricDate: date.toISOString().slice(0, 10),
        dayLabel: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
        region: region.name,
        sales,
        orders,
        visitors,
        conversionRate,
        energyKwh: round(8_600 * regionFactor * (1 + Math.sin((dayIndex + 1) / 7) * 0.018), 2),
      });
    }

    const categoryShares = [0.29, 0.24, 0.19, 0.16, 0.12];
    ['智能设备', '工业配件', '办公用品', '服务套餐', '其他'].forEach((category, index) => {
      categories.push({
        region: region.name,
        category,
        sortOrder: index + 1,
        sales: round(3_650_000 * regionFactor * categoryShares[index], 2),
      });
    });

    const channelShares = [0.34, 0.27, 0.22, 0.17];
    ['自然访问', '营销活动', '合作渠道', '直接访问'].forEach((channel, index) => {
      channels.push({
        region: region.name,
        channel,
        sortOrder: index + 1,
        visitors: Math.round(920_000 * regionFactor * channelShares[index]),
      });
    });

    ['获客能力', '履约效率', '客户满意', '成本控制', '增长潜力', '团队协作'].forEach((indicator, index) => {
      radar.push({
        region: region.name,
        indicator,
        sortOrder: index + 1,
        score: round(76 + regionIndex * 2 + Math.sin((index + regionIndex) * 1.2) * 5, 1),
        maxValue: 100,
      });
    });

    const funnelBase = Math.round(120_000 * regionFactor);
    const funnelRates = [1, 0.72, 0.51, 0.36, 0.25];
    ['访问', '咨询', '试用', '下单', '复购'].forEach((stage, index) => {
      funnel.push({
        region: region.name,
        stage,
        sortOrder: index + 1,
        value: Math.round(funnelBase * funnelRates[index]),
      });
    });

    for (let index = 0; index < 8; index += 1) {
      const occurredAt = new Date(normalizedAnchor);
      occurredAt.setUTCHours(9 + index, (index * 7) % 60, 0, 0);
      alerts.push({
        region: region.name,
        deviceCode: `${region.code.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        deviceName: `生产设备${index + 1}`,
        level: index % 5 === 0 ? '较高' : index % 3 === 0 ? '中等' : '提示',
        status: index % 4 === 0 ? '处理中' : '待确认',
        occurredAt: occurredAt.toISOString().slice(0, 19).replace('T', ' '),
      });
    }
  });

  return { regions: MOCK_REGIONS, daily, categories, channels, radar, funnel, alerts };
}

const regionParam = [{ name: 'region', type: 'string' as const, defaultValue: '华东' }];

export const MOCK_API_CONFIGS: MockApiConfigSeed[] = [
  { name: 'Mock｜近30日销售趋势', mockKey: 'sales-trend', protocol: 'axis', params: regionParam },
  { name: 'Mock｜订单与访问趋势', mockKey: 'order-visitor-trend', protocol: 'axis', params: regionParam },
  { name: 'Mock｜区域销售对比', mockKey: 'region-sales', protocol: 'axis', params: [] },
  { name: 'Mock｜营收与转化率', mockKey: 'revenue-conversion', protocol: 'combo', params: regionParam },
  { name: 'Mock｜品类销售占比', mockKey: 'category-sales', protocol: 'nameValue', params: regionParam },
  { name: 'Mock｜渠道流量占比', mockKey: 'channel-traffic', protocol: 'nameValue', params: regionParam },
  { name: 'Mock｜用户转化漏斗', mockKey: 'conversion-funnel', protocol: 'nameValue', params: regionParam },
  { name: 'Mock｜运营能力雷达', mockKey: 'operation-radar', protocol: 'radar', params: regionParam },
  { name: 'Mock｜设备健康度', mockKey: 'device-health', protocol: 'nameValue', params: regionParam },
  { name: 'Mock｜核心经营指标', mockKey: 'business-kpi', protocol: 'kpi-1', params: regionParam },
  { name: 'Mock｜设备告警明细', mockKey: 'device-alerts', protocol: 'table', params: regionParam },
  { name: 'Mock｜区域下拉选项', mockKey: 'region-options', protocol: 'options', params: [] },
];

/** 将底层业务明细投影成组件可直接消费的数据协议。 */
export function createMockApiDatasets(dataset: MockDataset): MockDatasetSeed[] {
  const byRegion = (region: string) => dataset.daily.filter((item) => item.region === region);
  const variants = (build: (region: string) => unknown) => MOCK_REGIONS.map((region) => ({
    params: { region: region.name },
    data: build(region.name),
  }));
  const definition = (key: string) => {
    const found = MOCK_API_CONFIGS.find((item) => item.mockKey === key);
    if (!found) throw new Error(`缺少 Mock API 定义：${key}`);
    return found;
  };
  const regional = (key: string, build: (region: string) => unknown): MockDatasetSeed => ({
    key,
    protocol: definition(key).protocol,
    variants: variants(build),
  });

  return [
    regional('sales-trend', (region) => {
      const rows = byRegion(region);
      return { categories: rows.map((item) => item.dayLabel), series: [{ name: '销售额', data: rows.map((item) => item.sales) }] };
    }),
    regional('order-visitor-trend', (region) => {
      const rows = byRegion(region);
      return {
        categories: rows.map((item) => item.dayLabel),
        series: [
          { name: '订单量', data: rows.map((item) => item.orders) },
          { name: '访问量', data: rows.map((item) => item.visitors) },
        ],
      };
    }),
    {
      key: 'region-sales',
      protocol: definition('region-sales').protocol,
      defaultData: {
        categories: MOCK_REGIONS.map((item) => item.name),
        series: [{
          name: '近30日销售额',
          data: MOCK_REGIONS.map((region) => round(byRegion(region.name).reduce((sum, item) => sum + item.sales, 0), 2)),
        }],
      },
      variants: [],
    },
    regional('revenue-conversion', (region) => {
      const rows = byRegion(region);
      return {
        categories: rows.map((item) => item.dayLabel),
        series: [
          { name: '营收', type: 'bar', yAxisIndex: 0, data: rows.map((item) => item.sales) },
          { name: '转化率', type: 'line', yAxisIndex: 1, data: rows.map((item) => item.conversionRate) },
        ],
      };
    }),
    regional('category-sales', (region) => dataset.categories
      .filter((item) => item.region === region)
      .map((item) => ({ name: item.category, value: item.sales }))),
    regional('channel-traffic', (region) => dataset.channels
      .filter((item) => item.region === region)
      .map((item) => ({ name: item.channel, value: item.visitors }))),
    regional('conversion-funnel', (region) => dataset.funnel
      .filter((item) => item.region === region)
      .map((item) => ({ name: item.stage, value: item.value }))),
    regional('operation-radar', (region) => {
      const rows = dataset.radar.filter((item) => item.region === region);
      return {
        indicators: rows.map((item) => ({ name: item.indicator, max: item.maxValue })),
        series: [{ name: region, data: rows.map((item) => item.score) }],
      };
    }),
    regional('device-health', (region) => [{
      name: '设备健康度',
      value: round(97 - dataset.alerts.filter((item) => item.region === region && item.level !== '提示').length * 0.35, 1),
    }]),
    regional('business-kpi', (region) => {
      const rows = byRegion(region);
      const sales = round(rows.reduce((sum, item) => sum + item.sales, 0), 2);
      const orders = rows.reduce((sum, item) => sum + item.orders, 0);
      const conversion = round(rows.reduce((sum, item) => sum + item.conversionRate, 0) / rows.length, 2);
      return [
        { name: '销售额', value: sales, unit: '元', trend: 3.8, trendDir: 'up' },
        { name: '订单量', value: orders, unit: '单', trend: 2.6, trendDir: 'up' },
        { name: '转化率', value: conversion, unit: '%', trend: 0.4, trendDir: 'up' },
      ];
    }),
    regional('device-alerts', (region) => ({
      columns: [
        { key: 'deviceCode', label: '设备编号' },
        { key: 'deviceName', label: '设备名称' },
        { key: 'level', label: '告警等级' },
        { key: 'status', label: '状态' },
        { key: 'occurredAt', label: '发生时间' },
      ],
      rows: dataset.alerts.filter((item) => item.region === region).map((item) => ({
        deviceCode: item.deviceCode,
        deviceName: item.deviceName,
        level: item.level,
        status: item.status,
        occurredAt: item.occurredAt,
      })),
    })),
    {
      key: 'region-options',
      protocol: definition('region-options').protocol,
      defaultData: dataset.regions.map((item) => ({ label: item.name, value: item.name })),
      variants: [],
    },
  ];
}
