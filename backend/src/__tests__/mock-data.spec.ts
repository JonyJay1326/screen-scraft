import { validateProtocol, type ProtocolKind } from '@screencraft/shared';
import { describe, expect, it } from 'vitest';
import { createMockApiDatasets, createMockDataset, MOCK_API_CONFIGS, MOCK_REGIONS } from '../mock-data';

describe('mock data', () => {
  it('为每个区域生成 30 天平滑趋势', () => {
    const dataset = createMockDataset(new Date('2026-09-11T00:00:00Z'));
    expect(dataset.daily).toHaveLength(MOCK_REGIONS.length * 30);
    for (const region of MOCK_REGIONS) {
      const rows = dataset.daily.filter((item) => item.region === region.name);
      expect(rows).toHaveLength(30);
      for (let index = 1; index < rows.length; index += 1) {
        const salesChange = Math.abs(rows[index].sales - rows[index - 1].sales) / rows[index - 1].sales;
        const visitorChange = Math.abs(rows[index].visitors - rows[index - 1].visitors) / rows[index - 1].visitors;
        expect(salesChange).toBeLessThan(0.03);
        expect(visitorChange).toBeLessThan(0.03);
      }
    }
  });

  it('所有 Mock API 数据均符合声明协议', () => {
    const datasets = createMockApiDatasets(createMockDataset(new Date('2026-09-11T00:00:00Z')));
    expect(datasets).toHaveLength(MOCK_API_CONFIGS.length);
    for (const dataset of datasets) {
      const samples = [dataset.defaultData, ...dataset.variants.map((item) => item.data)]
        .filter((item) => item !== undefined);
      expect(samples.length).toBeGreaterThan(0);
      for (const sample of samples) {
        expect(validateProtocol(dataset.protocol as ProtocolKind, sample)).toEqual([]);
      }
    }
  });
});
