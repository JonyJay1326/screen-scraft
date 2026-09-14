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
  };
}
