import { describe, expect, it } from 'vitest';
import {
  buildAiScreenStructureDraft,
  validateAiScreenStructureDraft,
} from '../ai-screen-draft';

describe('整屏结构草稿', () => {
  it('从模型解析值创建无共享引用的本地草稿', () => {
    const input = {
      ...analysisResult(),
      canvas: {
        ...analysisResult().canvas,
        backgroundLayer: {
          kind: 'interactiveScene' as const,
          bounds: { x: 0, y: 60, w: 1920, h: 1020 },
          description: '园区全景背景图',
          confidence: 0.95,
          notes: '定位标记是否独立交互无法从截图确认',
        },
      },
    };
    const draft = buildAiScreenStructureDraft(input);
    expect(draft).toMatchObject({
      canvas: { width: 1920, height: 1080, backgroundLayer: { kind: 'interactiveScene', description: '园区全景背景图' } },
      components: [{ id: 'screen-draft-1', included: true, name: '趋势图' }],
    });
    expect(draft?.canvas.backgroundLayer).not.toBe(input.canvas.backgroundLayer);
    expect(draft?.canvas.backgroundLayer?.bounds).not.toBe(input.canvas.backgroundLayer.bounds);
    expect(draft?.components[0]).not.toBe(input.components[0]);
    expect(draft?.components[0]?.bounds).not.toBe(input.components[0]?.bounds);
  });

  it('接受 32 个组件并拒绝缺少基础字段或超过硬上限的解析值', () => {
    expect(buildAiScreenStructureDraft({ canvas: {}, components: [] })).toBeNull();
    const input = analysisResult();
    input.components = Array.from({ length: 32 }, (_, index) => ({
      ...input.components[0]!,
      order: index + 1,
      name: `组件${index + 1}`,
      bounds: { x: index * 2, y: 0, w: 1, h: 1 },
    }));
    const draft = buildAiScreenStructureDraft(input);
    expect(draft?.components).toHaveLength(32);
    expect(validateAiScreenStructureDraft(draft!)).toEqual([]);
    input.components.push({ ...input.components[0]!, order: 33 });
    expect(buildAiScreenStructureDraft(input)).toBeNull();
  });

  it('保留识别样式与模拟数据，并与模型解析对象隔离引用', () => {
    const input = analysisResult();
    input.canvas.appearance = {
      panelBackgroundColor: '#17191B',
      panelBorderColor: '#30343A',
      titleColor: '#FFFFFF',
      textColor: '#AAB0BA',
      valueColor: '#E8EDF5',
      accentColors: ['#2F7FF7', '#39D9B2'],
      panelRadius: 2,
    };
    input.components[0]!.appearance = {
      panelPadding: 16,
      iconName: 'activity',
      iconColor: '#39D9B2',
      iconBackgroundColor: '#173B36',
      showPeriodTabs: true,
      activePeriodTab: '日',
      showDemoTooltip: true,
      tooltipTitle: '12:00',
      tooltipPrimaryValue: '5000t',
      tooltipSecondaryValue: '3780t',
      chart: { lineSmooth: false, lineWidth: 2 },
    };
    input.components[0]!.mockData = {
      categories: ['10:00', '12:00'],
      series: [{ name: '实际', data: [3800, 5000] }],
    };
    input.components[0]!.dataConfidence = 0.86;

    const draft = buildAiScreenStructureDraft(input)!;
    expect(draft.canvas.appearance).toEqual(input.canvas.appearance);
    expect(draft.components[0]).toMatchObject({
      appearance: {
        panelPadding: 16,
        iconName: 'activity',
        iconColor: '#39D9B2',
        iconBackgroundColor: '#173B36',
        showPeriodTabs: true,
        activePeriodTab: '日',
        showDemoTooltip: true,
        tooltipTitle: '12:00',
        tooltipPrimaryValue: '5000t',
        tooltipSecondaryValue: '3780t',
        chart: { lineSmooth: false, lineWidth: 2 },
      },
      mockData: { categories: ['10:00', '12:00'] },
      dataConfidence: 0.86,
    });
    expect(draft.canvas.appearance).not.toBe(input.canvas.appearance);
    expect(draft.canvas.appearance?.accentColors).not.toBe(input.canvas.appearance.accentColors);
    expect(draft.components[0]?.appearance).not.toBe(input.components[0]?.appearance);
    expect(draft.components[0]?.appearance?.chart).not.toBe(input.components[0]?.appearance?.chart);
    expect(draft.components[0]?.mockData).not.toBe(input.components[0]?.mockData);
  });

  it('拒绝字段不完整的背景层描述', () => {
    const input = {
      ...analysisResult(),
      canvas: {
        ...analysisResult().canvas,
        backgroundLayer: {
          kind: 'image' as const,
          bounds: { x: 0, y: 60, w: 1920, h: 1020 },
          description: '',
          confidence: 0.95,
          notes: '',
        },
      },
    };
    expect(buildAiScreenStructureDraft(input)).toBeNull();
  });

  it('报告空草稿、越界坐标和大面积重叠', () => {
    const draft = buildAiScreenStructureDraft(analysisResult())!;
    draft.components.push({
      ...draft.components[0]!,
      id: 'screen-draft-2',
      name: '重叠指标',
      type: 'kpi',
      bounds: { x: 100, y: 120, w: 200, h: 100 },
      seriesCount: 0,
    });
    expect(validateAiScreenStructureDraft(draft).some((item) => item.message.includes('大面积重叠'))).toBe(true);
    draft.components[1]!.bounds = { x: 1900, y: 100, w: 100, h: 100 };
    expect(validateAiScreenStructureDraft(draft).some((item) => item.message.includes('超出画布'))).toBe(true);
    draft.components.forEach((component) => { component.included = false; });
    expect(validateAiScreenStructureDraft(draft)).toEqual([
      { path: '$.components', message: '至少保留 1 个组件' },
    ]);
  });
});

function analysisResult() {
  return {
    canvas: { width: 1920, height: 1080, backgroundColor: '#101820' },
    ignoredRegions: [],
    components: [{
      order: 1,
      type: 'line',
      name: '趋势图',
      bounds: { x: 40, y: 100, w: 900, h: 420 },
      title: '趋势图',
      visibleTexts: ['趋势图'],
      seriesCount: 2,
      confidence: 0.9,
      notes: '',
    }],
    warnings: [],
  } as {
    canvas: {
      width: number;
      height: number;
      backgroundColor: string;
      appearance?: {
        panelBackgroundColor: string;
        panelBorderColor: string;
        titleColor: string;
        textColor: string;
        valueColor: string;
        accentColors: string[];
        panelRadius: number;
      };
    };
    ignoredRegions: never[];
    components: Array<{
      order: number;
      type: string;
      name: string;
      bounds: { x: number; y: number; w: number; h: number };
      title: string;
      visibleTexts: string[];
      seriesCount: number;
      appearance?: {
        panelPadding: number;
        iconName: 'activity';
        iconColor: string;
        iconBackgroundColor: string;
        showPeriodTabs: boolean;
        activePeriodTab: '日';
        showDemoTooltip: boolean;
        tooltipTitle: string;
        tooltipPrimaryValue: string;
        tooltipSecondaryValue: string;
        chart: { lineSmooth: boolean; lineWidth: number };
      };
      mockData?: { categories: string[]; series: Array<{ name: string; data: number[] }> };
      dataConfidence?: number;
      confidence: number;
      notes: string;
    }>;
    warnings: never[];
  };
}
