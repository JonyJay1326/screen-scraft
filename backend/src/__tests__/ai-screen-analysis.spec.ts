import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import type { AiReferenceAssetsService } from '../ai/ai-reference-assets.service';
import type { AiSettings } from '../ai/ai.schema';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('整屏截图模型能力测试', () => {
  it('使用视觉模型和 JSON Output，并返回原始内容及合法解析结果', async () => {
    const service = createService();
    const modelResult = {
      canvas: { width: 1920, height: 1080, backgroundColor: '#061226' },
      ignoredRegions: [],
      components: [
        {
          order: 1,
          type: 'line',
          name: '用汽趋势',
          bounds: { x: 40, y: 120, w: 900, h: 420 },
          title: '用汽趋势',
          visibleTexts: ['用汽趋势', '本月', '上月'],
          seriesCount: 2,
          confidence: 0.96,
          notes: '',
        },
      ],
      warnings: [],
    };
    const rawContent = JSON.stringify(modelResult);
    const request = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: rawContent } }] },
    });

    const result = await service.analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect(result).toEqual({
      model: 'deepseek-v4-flash-vision-exp',
      rawContent,
      parsedContent: modelResult,
      validationIssues: [],
    });
    const payload = request.mock.calls[0][1] as {
      model: string;
      response_format: unknown;
      thinking: unknown;
      messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>;
    };
    expect(payload.model).toBe('deepseek-v4-flash-vision-exp');
    expect(payload.response_format).toEqual({ type: 'json_object' });
    expect(payload.thinking).toEqual({ type: 'disabled' });
    expect(payload.messages[0].content).toContain('只返回合法 JSON');
    const userPrompt = (payload.messages[1].content as Array<{ type: string; text?: string }>).find(
      (item) => item.type === 'text',
    )?.text;
    expect(userPrompt).toContain('按编辑单元拆分，不按外层大卡片粗略合并');
    expect(userPrompt).toContain('包含主要数值、进度条、状态统计或交互控件的区域禁止标为 text');
    expect(userPrompt).toContain('顶部 y 相差不超过 32px 的视为同一行');
    expect(userPrompt).toContain('不补字、不改写、不推断被遮挡内容');
    expect(userPrompt).toContain('绝对不能超过 32 个');
    expect(userPrompt).toContain('不得仅为了压缩组件数量而合并');
    expect(userPrompt).toContain('超过 20 时在 warnings 提醒');
    expect(userPrompt).toContain('纵向连续排列且均属于 KPI、进度条或对比指标');
    expect(userPrompt).toContain('禁止拆成标题、进度条和若干窄行');
    expect(userPrompt).toContain('大屏自身的告警条、页面主标题、日期、天气');
    expect(userPrompt).toContain('属于页面级背景层：写入 canvas.backgroundLayer');
    expect(userPrompt).toContain('必须用 interactiveScene 或 video');
    expect(userPrompt).toContain('工具栏归入 backgroundLayer.notes');
    expect(userPrompt).toContain('页面级背景层不得再写入 components');
    expect(userPrompt).toContain('禁止把“设备态势”“运行工况”“能耗”等面板标题拆成独立窄 text');
    expect(userPrompt).toContain('“年化产量”数值和旁边的“月单产”柱状对比必须分别输出 kpi 与 bar');
    expect(userPrompt).toContain('严禁两个拆分组件复制同一个外层卡片 bounds');
    expect(userPrompt).toContain('禁止明知应归入背景层却为保留文字继续输出该组件');
    expect(userPrompt).toContain('是否仍存在“产品态势标题”');
    expect(userPrompt).toContain('绝不能写成 kpiList');
    expect(userPrompt).toContain('表格只保留标题、筛选文字、列名和最多 3 行');
    expect(userPrompt).toContain('禁止先输出完整左列再输出中列或右列');
    expect(userPrompt).toContain('title 必须逐字存在于 visibleTexts');
    expect(userPrompt).toContain('pie 和 gauge 固定为 1');
    expect(userPrompt).toContain('canvas.appearance 必须输出页面公共视觉');
    expect(userPrompt).toContain('component.appearance 只输出相对 canvas.appearance 不同的局部覆盖');
    expect(userPrompt).toContain('line/bar 使用 {"categories"');
    expect(userPrompt).toContain('折线/柱状曲线可按坐标轴近似取 6 至 12 个点');
    expect(userPrompt).toContain('禁止 CSS、HTML、SVG、函数、URL');
    expect(userPrompt).toContain('设备统计是强制拆分例外');
    expect(userPrompt).toContain('底边必须停在第一个 kpiList 顶边之前');
    expect(userPrompt).toContain('每个 kpi 数据项必须完整包含 name、value、unit、trend、trendDir');
    expect(userPrompt).toContain('表格最多 8 列、12 行');
    expect(userPrompt).toContain('component.appearance.accentColors 输出局部颜色');
    expect(userPrompt).toContain('可选值只有 none、auto、activity、alarm、clock');
    expect(userPrompt).toContain('禁止输出图标 URL、SVG、HTML、emoji 或自造名称');
    expect(userPrompt).toContain('只复刻当前静态外观，不推断点击逻辑');
    expect(userPrompt).toContain('仅当截图当前确实展开图表 tooltip');
    expect(payload.messages[1].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'text', text: expect.stringContaining('1920×1080') }),
      expect.objectContaining({
        type: 'image_url',
        image_url: expect.objectContaining({
          url: expect.stringMatching(/^data:image\/png;base64,/),
          detail: 'original',
        }),
      }),
    ]));
  });

  it('把明确自述为仪表盘且含设备状态的 KPI 列表归一化为 gauge', async () => {
    const modelResult = {
      canvas: { width: 1920, height: 1080, backgroundColor: '#061226' },
      ignoredRegions: [],
      components: [{
        order: 1,
        type: 'kpiList',
        name: '单晶设备态势',
        bounds: { x: 1450, y: 80, w: 420, h: 230 },
        title: '单晶设备态势',
        visibleTexts: ['单晶设备态势', '单晶稼动率 98%', '运行 138', '故障 2', '停机 420'],
        seriesCount: 0,
        confidence: 0.9,
        notes: '含仪表盘与 KPI 列表',
      }],
      warnings: [],
    };
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: JSON.stringify(modelResult) } }] },
    });

    const result = await createService().analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect((result.parsedContent as typeof modelResult).components).toEqual([
      expect.objectContaining({ type: 'gauge', seriesCount: 1 }),
    ]);
    expect(result.validationIssues).toEqual([]);
  });

  it('把包含同高右侧图表的 KPI 父边界收缩到图表左侧', async () => {
    const modelResult = {
      canvas: { width: 1920, height: 1080, backgroundColor: '#061226' },
      ignoredRegions: [],
      components: [
        {
          order: 1,
          type: 'kpi',
          name: '年化产量',
          bounds: { x: 20, y: 370, w: 400, h: 130 },
          title: '',
          visibleTexts: ['5 GW', '年化产量'],
          seriesCount: 0,
          confidence: 0.9,
          notes: '',
        },
        {
          order: 2,
          type: 'bar',
          name: '月单产对比',
          bounds: { x: 150, y: 370, w: 270, h: 130 },
          title: '',
          visibleTexts: ['170kg/天', '180kg/天'],
          seriesCount: 2,
          confidence: 0.85,
          notes: '柱状对比图',
        },
      ],
      warnings: [],
    };
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: JSON.stringify(modelResult) } }] },
    });

    const result = await createService().analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect((result.parsedContent as typeof modelResult).components).toEqual([
      expect.objectContaining({ name: '年化产量', bounds: { x: 20, y: 370, w: 130, h: 130 } }),
      expect.objectContaining({ name: '月单产对比', bounds: { x: 150, y: 370, w: 270, h: 130 } }),
    ]);
    expect(result.validationIssues).toEqual([]);
  });

  it('将同列紧贴且名称同源的游离标题并入主体组件', async () => {
    const modelResult = {
      canvas: { width: 1920, height: 1080, backgroundColor: '#061226' },
      ignoredRegions: [],
      components: [
        {
          order: 1,
          type: 'text',
          name: '单晶设备态势标题',
          bounds: { x: 1500, y: 70, w: 150, h: 30 },
          title: '单晶设备态势',
          visibleTexts: ['单晶设备态势'],
          seriesCount: 0,
          confidence: 0.95,
          notes: '',
        },
        {
          order: 2,
          type: 'gauge',
          name: '单晶设备态势仪表盘',
          bounds: { x: 1500, y: 100, w: 400, h: 200 },
          title: '',
          visibleTexts: ['单晶总功率', '560'],
          seriesCount: 1,
          confidence: 0.9,
          notes: '',
        },
      ],
      warnings: [],
    };
    const rawContent = JSON.stringify(modelResult);
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: rawContent } }] },
    });

    const result = await createService().analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect(result.rawContent).toBe(rawContent);
    expect((result.parsedContent as typeof modelResult).components).toEqual([
      expect.objectContaining({
        order: 1,
        type: 'gauge',
        name: '单晶设备态势仪表盘',
        title: '单晶设备态势',
        bounds: { x: 1500, y: 70, w: 400, h: 230 },
        visibleTexts: ['单晶设备态势', '单晶总功率', '560'],
      }),
    ]);
    expect(result.validationIssues).toEqual([]);
  });

  it('从解析结果移除三维背景层重复输出的场景控制栏，同时保留模型原文', async () => {
    const sceneControl = {
      order: 2,
      type: 'unsupported',
      name: '底部视角控制栏',
      bounds: { x: 700, y: 1010, w: 700, h: 60 },
      title: '',
      visibleTexts: ['1X', '播放倍率', '视角漫游', '隐藏面板', '后台视频'],
      seriesCount: 0,
      confidence: 0.85,
      notes: '三维场景视角与播放控制工具栏，归入背景层交互能力',
    };
    const modelResult = {
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: '#061226',
        backgroundLayer: {
          kind: 'interactiveScene',
          bounds: { x: 300, y: 60, w: 1300, h: 1020 },
          description: '三维园区场景',
          confidence: 0.95,
          notes: '包含定位标记与视角控制',
        },
      },
      ignoredRegions: [],
      components: [
        {
          order: 1,
          type: 'line',
          name: '生产态势',
          bounds: { x: 20, y: 500, w: 400, h: 200 },
          title: '生产态势',
          visibleTexts: ['生产态势'],
          seriesCount: 2,
          confidence: 0.9,
          notes: '',
        },
        sceneControl,
      ],
      warnings: [],
    };
    const rawContent = JSON.stringify(modelResult);
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: rawContent } }] },
    });

    const result = await createService().analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect(result.rawContent).toBe(rawContent);
    expect((result.parsedContent as typeof modelResult).components).toEqual([
      expect.objectContaining({ name: '生产态势', order: 1 }),
    ]);
    expect(result.validationIssues).toEqual([]);
  });

  it('保留原始模型顺序，同时把解析结果确定性重排为行优先顺序', async () => {
    const lowerComponent = {
      order: 1,
      type: 'line',
      name: '下方趋势',
      bounds: { x: 40, y: 500, w: 900, h: 300 },
      title: '下方趋势',
      visibleTexts: ['下方趋势'],
      seriesCount: 2,
      confidence: 0.9,
      notes: '',
    };
    const upperComponent = {
      order: 2,
      type: 'table',
      name: '上方表格',
      bounds: { x: 1200, y: 100, w: 600, h: 300 },
      title: '上方表格',
      visibleTexts: ['上方表格'],
      seriesCount: 0,
      confidence: 0.9,
      notes: '',
    };
    const modelResult = {
      canvas: { width: 1920, height: 1080, backgroundColor: '#061226' },
      ignoredRegions: [],
      components: [lowerComponent, upperComponent],
      warnings: [],
    };
    const rawContent = JSON.stringify(modelResult);
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: rawContent } }] },
    });

    const result = await createService().analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect(result.rawContent).toBe(rawContent);
    expect(result.parsedContent).toMatchObject({
      components: [
        { name: '上方表格', order: 1 },
        { name: '下方趋势', order: 2 },
      ],
    });
    expect(result.validationIssues).toEqual([]);
  });

  it('将真实三列大屏的按列输出重排为从上到下、同一行从左到右', async () => {
    const component = (
      order: number,
      name: string,
      type: string,
      bounds: { x: number; y: number; w: number; h: number },
      seriesCount = 0,
    ) => ({
      order,
      type,
      name,
      bounds,
      title: '',
      visibleTexts: [],
      seriesCount,
      confidence: 0.9,
      notes: '',
    });
    const modelResult = {
      canvas: { width: 1920, height: 1080, backgroundColor: '#0a0e1a' },
      ignoredRegions: [],
      components: [
        component(1, '页面标题', 'text', { x: 20, y: 62, w: 200, h: 40 }),
        component(2, '车间选择下拉框', 'unsupported', { x: 1655, y: 62, w: 245, h: 40 }),
        component(3, '设备统计仪表盘', 'gauge', { x: 30, y: 115, w: 490, h: 175 }, 1),
        component(4, '网关统计列表', 'kpiList', { x: 30, y: 290, w: 490, h: 130 }),
        component(5, '设备类型统计', 'kpiList', { x: 30, y: 425, w: 490, h: 165 }),
        component(6, '管损分析指标', 'kpiList', { x: 30, y: 600, w: 490, h: 460 }),
        component(7, '顶部核心指标', 'kpiList', { x: 545, y: 115, w: 835, h: 115 }),
        component(8, '车间用汽趋势', 'line', { x: 545, y: 240, w: 835, h: 490 }, 2),
        component(9, '车间告警统计', 'kpiList', { x: 545, y: 740, w: 835, h: 320 }),
        component(10, '近7日告警处理率', 'pie', { x: 880, y: 760, w: 500, h: 290 }, 1),
        component(11, '当日班组用汽信息', 'table', { x: 1395, y: 115, w: 505, h: 610 }),
        component(12, '车间调控统计', 'pie', { x: 1395, y: 740, w: 505, h: 320 }, 1),
      ],
      warnings: [],
    };
    const rawContent = JSON.stringify(modelResult);
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: rawContent } }] },
    });

    const result = await createService().analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect(result.rawContent).toBe(rawContent);
    expect((result.parsedContent as typeof modelResult).components.map(({ name, order }) => ({ name, order }))).toEqual([
      { name: '页面标题', order: 1 },
      { name: '车间选择下拉框', order: 2 },
      { name: '设备统计仪表盘', order: 3 },
      { name: '顶部核心指标', order: 4 },
      { name: '当日班组用汽信息', order: 5 },
      { name: '车间用汽趋势', order: 6 },
      { name: '网关统计列表', order: 7 },
      { name: '设备类型统计', order: 8 },
      { name: '管损分析指标', order: 9 },
      { name: '车间告警统计', order: 10 },
      { name: '近7日告警处理率', order: 11 },
      { name: '车间调控统计', order: 12 },
    ]);
    expect(result.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('重叠超过') }),
    ]));
    expect(result.validationIssues).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('禁止按整列') }),
    ]));
  });

  it('补齐 KPI 展示字段并收缩覆盖已拆分列表的仪表盘父边界', async () => {
    const component = (
      order: number,
      type: string,
      name: string,
      bounds: { x: number; y: number; w: number; h: number },
      mockData?: Array<Record<string, unknown>>,
    ) => ({
      order,
      type,
      name,
      bounds,
      title: type === 'gauge' ? '设备统计' : '',
      visibleTexts: type === 'gauge' ? ['设备统计', '80%', '采集'] : [name],
      seriesCount: type === 'gauge' ? 1 : 0,
      ...(mockData ? { mockData, dataConfidence: 0.9 } : {}),
      confidence: 0.9,
      notes: type === 'gauge' ? '已按规则拆分，边界覆盖完整设备统计区域' : '',
    });
    const modelResult = {
      canvas: { width: 1920, height: 1080, backgroundColor: '#0d0d0d' },
      ignoredRegions: [],
      components: [
        component(1, 'gauge', '设备统计仪表盘', { x: 24, y: 112, w: 500, h: 500 }, [{ name: '采集', value: 80 }]),
        component(2, 'kpiList', '网关统计', { x: 40, y: 288, w: 468, h: 112 }, [{ name: '网关总数', value: '27 个' }]),
        component(3, 'kpiList', '设备类型统计', { x: 40, y: 412, w: 468, h: 180 }, [{ name: '流量计', value: '20 /20' }]),
        component(4, 'kpi', '今日用汽量', { x: 548, y: 112, w: 256, h: 96 }, [{ name: '今日用汽量', value: '380.22', unit: 't' }]),
        component(5, 'kpi', '今日运行时间', { x: 820, y: 112, w: 256, h: 96 }, [{ name: '今日运行时间', value: '8 h 15 min' }]),
        component(6, 'kpi', '实时生产班组占比', { x: 1092, y: 112, w: 256, h: 96 }, [{ name: '实时生产班组占比', value: '80 %' }]),
      ],
      warnings: [],
    };
    const rawContent = JSON.stringify(modelResult);
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: rawContent } }] },
    });

    const result = await createService().analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');
    const parsed = result.parsedContent as typeof modelResult;

    expect(result.rawContent).toBe(rawContent);
    expect(parsed.components.map(({ name, order }) => ({ name, order }))).toEqual([
      { name: '设备统计仪表盘', order: 1 },
      { name: '今日用汽量', order: 2 },
      { name: '今日运行时间', order: 3 },
      { name: '实时生产班组占比', order: 4 },
      { name: '网关统计', order: 5 },
      { name: '设备类型统计', order: 6 },
    ]);
    expect(parsed.components[0]).toMatchObject({ bounds: { x: 24, y: 112, w: 500, h: 176 } });
    expect(parsed.components.slice(1, 4).map((item) => item.mockData?.[0])).toEqual([
      { name: '今日用汽量', value: '380.22', unit: 't', trend: 0, trendDir: 'up' },
      { name: '今日运行时间', value: '8 h 15 min', unit: '', trend: 0, trendDir: 'up' },
      { name: '实时生产班组占比', value: '80 %', unit: '', trend: 0, trendDir: 'up' },
    ]);
    expect(result.validationIssues).toEqual([]);
  });

  it('保留不合格模型原文，并返回契约问题', async () => {
    const service = createService();
    const rawContent = JSON.stringify({
      canvas: { width: 1280, height: 720, backgroundColor: '#000000' },
      ignoredRegions: [],
      components: [{
        order: 1,
        type: 'map',
        name: '地图',
        bounds: { x: 1200, y: 0, w: 500, h: 500 },
        title: '',
        visibleTexts: [],
        seriesCount: 0,
        confidence: 1,
        notes: '',
      }],
      warnings: [],
    });
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: rawContent } }] },
    });

    const result = await service.analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1');

    expect(result.rawContent).toBe(rawContent);
    expect(result.parsedContent).not.toBeNull();
    expect(result.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '$.canvas.width' }),
      expect.objectContaining({ path: '$.canvas.height' }),
      expect.objectContaining({ path: '$.components[0].type' }),
    ]));
  });

  it('无法解析时仍返回原始内容', async () => {
    const service = createService();
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: 'not-json' } }] },
    });

    await expect(service.analyzeScreen({ referenceAssetId: 'asset-1' }, 'user-1')).resolves.toMatchObject({
      rawContent: 'not-json',
      parsedContent: null,
      validationIssues: [{ path: '$', message: 'DeepSeek 返回内容不是合法 JSON' }],
    });
  });
});

function createService(): AiService {
  const settings = {
    provider: 'deepseek' as const,
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnc: '',
    textModel: 'deepseek-v4-flash',
    visionModel: 'deepseek-v4-flash-vision-exp',
    visionEnabled: true,
    chatModel: '',
    embeddingModel: '',
  };
  const settingsModel = {
    findOne: () => ({ exec: async () => settings }),
  } as unknown as Model<AiSettings>;
  const configValues: Record<string, string> = {
    LLM_API_KEY: 'test-key',
    JWT_SECRET: 'test-secret',
  };
  const config = {
    get: (key: string) => configValues[key],
    getOrThrow: (key: string) => configValues[key],
  } as unknown as ConfigService;
  const referenceAssets = {
    readOwned: vi.fn(async () => ({
      mimeType: 'image/png' as const,
      buffer: Buffer.from('screen-image'),
      width: 1920,
      height: 1080,
    })),
  } as unknown as AiReferenceAssetsService;
  const borderAssets = {
    saveFromBuffer: vi.fn(),
    assertOwnedIds: vi.fn(),
  } as never;
  return new AiService({} as never, settingsModel, config, {} as never, referenceAssets, borderAssets);
}
