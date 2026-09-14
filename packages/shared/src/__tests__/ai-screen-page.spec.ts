import { describe, expect, it } from 'vitest';
import { createAiScreenCanvasTransform, projectAiScreenBounds } from '../ai-screen-page';

describe('整屏草稿页面坐标投影', () => {
  it('同尺寸画布保持组件边界不变', () => {
    const canvas = { width: 1920, height: 1080 };
    const transform = createAiScreenCanvasTransform(canvas, canvas);
    expect(transform).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
    expect(projectAiScreenBounds({ x: 30, y: 110, w: 490, h: 180 }, transform, canvas)).toEqual({
      x: 30,
      y: 110,
      w: 490,
      h: 180,
    });
  });

  it('不同宽高比时等比缩放并居中，不拉伸组件', () => {
    const target = { width: 1920, height: 1080 };
    const transform = createAiScreenCanvasTransform({ width: 2243, height: 1080 }, target);
    expect(transform.scale).toBeCloseTo(1920 / 2243);
    expect(transform.offsetX).toBe(0);
    expect(transform.offsetY).toBeGreaterThan(70);
    expect(projectAiScreenBounds({ x: 1810, y: 75, w: 420, h: 230 }, transform, target)).toEqual({
      x: 1549,
      y: 142,
      w: 360,
      h: 197,
    });
  });

  it('投影结果被限制在目标画布内', () => {
    const target = { width: 100, height: 100 };
    const transform = createAiScreenCanvasTransform({ width: 100, height: 100 }, target);
    expect(projectAiScreenBounds({ x: 99, y: 99, w: 20, h: 20 }, transform, target)).toEqual({
      x: 99,
      y: 99,
      w: 1,
      h: 1,
    });
  });
});
