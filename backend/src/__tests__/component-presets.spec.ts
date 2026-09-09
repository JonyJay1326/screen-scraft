import type { ComponentDefinitionSnapshot } from '@screencraft/shared';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import type { ComponentPreset, ComponentPresetDocument } from '../component-presets/component-preset.schema';
import { ComponentPresetsService } from '../component-presets/component-presets.service';

describe('个人组件预设', () => {
  it('创建、更新和删除预设不改变已经复制到大屏的实例快照', async () => {
    const fixture = createFixture();
    const created = await fixture.service.create({ name: ' 生产趋势 ', definition: lineDefinition() }, 'owner-1');
    const instanceSnapshot = clone(created.definition);
    const changed = clone(created.definition);
    changed.defaultStyle.dark.lineWidth = 5;

    const updated = await fixture.service.update(created._id, { name: '生产趋势新版', definition: changed }, 'owner-1');

    expect(updated.definition.specVersion).toBe(2);
    expect(updated.definition.defaultStyle.dark.lineWidth).toBe(5);
    expect(instanceSnapshot.specVersion).toBe(1);
    expect(instanceSnapshot.defaultStyle.dark.lineWidth).toBe(3);

    await fixture.service.remove(created._id, 'owner-1');
    expect(fixture.rows).toHaveLength(0);
    expect(instanceSnapshot.rendererKey).toBe('echarts-safe-v1');
  });

  it('拒绝其他用户读取、修改、复制和删除个人预设', async () => {
    const fixture = createFixture();
    const created = await fixture.service.create({ name: '生产趋势', definition: lineDefinition() }, 'owner-1');

    await expect(fixture.service.getById(created._id, 'owner-2', false)).rejects.toMatchObject({ bizCode: 403 });
    await expect(fixture.service.update(created._id, { name: '越权修改' }, 'owner-2')).rejects.toMatchObject({ bizCode: 403 });
    await expect(fixture.service.copy(created._id, 'owner-2')).rejects.toMatchObject({ bizCode: 403 });
    await expect(fixture.service.remove(created._id, 'owner-2')).rejects.toMatchObject({ bizCode: 403 });
    await expect(fixture.service.getById(created._id, 'admin-1', true)).resolves.toMatchObject({ ownerId: 'owner-1' });
  });

  it('拒绝空白名称和未知 renderer', async () => {
    const fixture = createFixture();
    await expect(fixture.service.create({ name: '   ', definition: lineDefinition() }, 'owner-1'))
      .rejects.toMatchObject({ bizCode: 4001 });
    await expect(fixture.service.create({
      name: '危险组件',
      definition: { ...lineDefinition(), rendererKey: 'unknown-renderer' as 'echarts-safe-v1' },
    }, 'owner-1')).rejects.toMatchObject({ bizCode: 4401 });

    await expect(fixture.service.create({
      name: '外链缩略图',
      definition: lineDefinition(),
      thumbnail: 'https://example.com/tracker.png',
    }, 'owner-1')).rejects.toMatchObject({ bizCode: 4001 });
  });
});

function createFixture(): { service: ComponentPresetsService; rows: ComponentPresetDocument[] } {
  const rows: ComponentPresetDocument[] = [];
  const createRow = (data: Record<string, unknown>): ComponentPresetDocument => {
    const now = new Date('2026-09-09T00:00:00.000Z');
    const row = {
      ...data,
      createdAt: now,
      updatedAt: now,
      save: async () => {
        row.updatedAt = new Date(row.updatedAt.getTime() + 1000);
        return row;
      },
    } as unknown as ComponentPresetDocument;
    return row;
  };
  const model = {
    create: async (data: Record<string, unknown>) => {
      const row = createRow(data);
      rows.push(row);
      return row;
    },
    findById: (id: string) => ({
      exec: async () => rows.find((row) => String(row._id) === String(id)) ?? null,
    }),
    find: (filter: { scope: string; ownerId?: string; 'definition.category'?: string }) => ({
      sort: () => ({
        exec: async () => rows.filter((row) => row.scope === filter.scope
          && (filter.ownerId === undefined || row.ownerId === filter.ownerId)
          && (filter['definition.category'] === undefined || row.definition.category === filter['definition.category'])),
      }),
    }),
    deleteOne: ({ _id }: { _id: Types.ObjectId }) => ({
      exec: async () => {
        const index = rows.findIndex((row) => String(row._id) === String(_id));
        if (index >= 0) {
          rows.splice(index, 1);
        }
      },
    }),
  } as unknown as Model<ComponentPreset>;
  return { service: new ComponentPresetsService(model), rows };
}

function lineDefinition(): ComponentDefinitionSnapshot {
  return {
    source: 'generated',
    rendererKey: 'echarts-safe-v1',
    specVersion: 1,
    category: 'chart',
    group: 'line',
    dataProtocol: 'axis',
    defaultSize: { w: 700, h: 360 },
    styleSchema: [
      { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列', aiWritable: true },
      { key: 'lineWidth', label: '线宽', type: 'number', min: 1, max: 20, step: 0.5, group: '系列', aiWritable: true },
    ],
    styleMode: 'editable',
    defaultStyle: {
      dark: { seriesColors: ['#2F7FF7', '#35E0FF'], lineWidth: 3 },
      light: { seriesColors: ['#2F7FF7', '#0EA5E9'], lineWidth: 3 },
    },
    safeSpec: {
      kind: 'chart',
      schemaVersion: 1,
      family: 'line',
      option: {
        line: { smooth: true, width: 3, areaOpacity: 0.18, symbol: 'circle' },
      },
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
