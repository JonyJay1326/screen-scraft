/* mock.js — 原型唯一数据源（window.DB）。页面禁止散落硬编码业务数据。
   字段口径与 docs/api.md §2 保持一致（原型内做了扁平化）。 */
(function () {
  window.DB = {
    user: { name: '管理员', role: 'admin' },

    projects: [
      { id: 'p1', name: '智慧水务集团', screenCount: 4, updatedAt: '2026-08-19 14:22' },
      { id: 'p2', name: '能源管理驾驶舱', screenCount: 3, updatedAt: '2026-08-18 09:41' },
      { id: 'p3', name: '园区安防中心', screenCount: 2, updatedAt: '2026-08-15 17:05' },
      { id: 'p4', name: '生产车间监控', screenCount: 3, updatedAt: '2026-08-12 11:30' },
      { id: 'p5', name: '客服运营看板', screenCount: 1, updatedAt: '2026-08-08 16:48' },
      { id: 'p6', name: '数据中台门户', screenCount: 2, updatedAt: '2026-08-02 10:12' }
    ],

    screens: [
      { id: 's1', projectId: 'p1', name: '水务总览驾驶舱', category: '通用', deployed: true, inUse: true, updatedAt: '2026-08-19 14:22', thumbSeed: 3 },
      { id: 's2', projectId: 'p1', name: '管网压力监测', category: '工业', deployed: true, inUse: false, updatedAt: '2026-08-17 10:08', thumbSeed: 7 },
      { id: 's3', projectId: 'p1', name: '二次供水泵房', category: '工业', deployed: false, inUse: false, updatedAt: '2026-08-16 09:12', thumbSeed: 11 },
      { id: 's4', projectId: 'p1', name: '营收分析看板', category: '通用', deployed: false, inUse: false, updatedAt: '2026-08-11 15:40', thumbSeed: 5 },
      { id: 's5', projectId: 'p2', name: '集团能耗总览', category: '能源', deployed: true, inUse: true, updatedAt: '2026-08-18 09:41', thumbSeed: 9 },
      { id: 's6', projectId: 'p2', name: '光伏出力监测', category: '能源', deployed: false, inUse: false, updatedAt: '2026-08-14 13:26', thumbSeed: 2 },
      { id: 's7', projectId: 'p2', name: '空调节能分析', category: '能源', deployed: false, inUse: false, updatedAt: '2026-08-10 18:03', thumbSeed: 13 },
      { id: 's8', projectId: 'p3', name: '安防态势大屏', category: '通用', deployed: true, inUse: true, updatedAt: '2026-08-15 17:05', thumbSeed: 6 },
      { id: 's9', projectId: 'p4', name: '产线 OEE 看板', category: '工业', deployed: true, inUse: false, updatedAt: '2026-08-12 11:30', thumbSeed: 8 },
      { id: 's10', projectId: 'p5', name: '客服中心实时看板', category: '通用', deployed: false, inUse: false, updatedAt: '2026-08-08 16:48', thumbSeed: 4 }
    ],

    categories: ['全部', '通用', '工业', '政务', '医疗', '交通', '能源'],

    templates: [
      { id: 't1', name: '通用数据驾驶舱', scope: 'public', category: '通用', thumbSeed: 1 },
      { id: 't2', name: '工业生产监控', scope: 'public', category: '工业', thumbSeed: 2 },
      { id: 't3', name: '能源双碳看板', scope: 'public', category: '能源', thumbSeed: 3 },
      { id: 't4', name: '政务服务中心', scope: 'public', category: '政务', thumbSeed: 4 },
      { id: 't5', name: '水务运营驾驶舱', scope: 'personal', category: '通用', thumbSeed: 5 },
      { id: 't6', name: '泵房设备监测', scope: 'personal', category: '工业', thumbSeed: 6 },
      { id: 't7', name: '客服话务看板', scope: 'personal', category: '通用', thumbSeed: 7 },
      { id: 't8', name: '园区通行态势', scope: 'personal', category: '交通', thumbSeed: 8 }
    ],

    /* 组件库（名称与 PRD 5.1 一致；variants=样式变体数） */
    componentLib: {
      charts: [
        { name: '折线图', variants: 5, icon: 'activity' },
        { name: '柱状图', variants: 5, icon: 'bar-chart-3' },
        { name: '饼图', variants: 5, icon: 'pie-chart' },
        { name: '组合图', variants: 5, icon: 'bar-chart-3' },
        { name: '漏斗图', variants: 5, icon: 'filter' },
        { name: '雷达图', variants: 5, icon: 'activity' },
        { name: '仪表盘', variants: 5, icon: 'gauge' },
        { name: '指标卡', variants: 12, icon: 'layout-grid' },
        { name: '表格', variants: 2, icon: 'table-2' }
      ],
      deco: [
        { name: '天气标题', variants: 2, icon: 'cloud-sun' },
        { name: '边框', variants: 5, icon: 'frame' }
      ],
      media: [
        { name: '图片', variants: 1, icon: 'image' },
        { name: '视频', variants: 1, icon: 'video' }
      ],
      controls: [
        { name: '常规按钮', variants: 1, icon: 'square' },
        { name: '图片按钮', variants: 1, icon: 'image' },
        { name: '热区按钮', variants: 1, icon: 'mouse-pointer' },
        { name: '下拉框', variants: 1, icon: 'chevron-down' },
        { name: '文本', variants: 1, icon: 'type' }
      ]
    },

    apiConfigs: [
      { id: 'a1', name: '水务-管网压力实时', type: 'sql', method: 'GET', path: '/data/a1', updatedAt: '2026-08-19 10:20', refCount: 3, status: 'ok' },
      { id: 'a2', name: '水务-月度供水量统计', type: 'sql', method: 'GET', path: '/data/a2', updatedAt: '2026-08-18 16:44', refCount: 2, status: 'ok' },
      { id: 'a3', name: '能耗-分项用电查询', type: 'sql', method: 'POST', path: '/data/a3', updatedAt: '2026-08-17 09:15', refCount: 5, status: 'ok' },
      { id: 'a4', name: '外部-设备台账接口', type: 'external', method: 'GET', path: 'http://iot.internal/api/devices', updatedAt: '2026-08-15 14:02', refCount: 1, status: 'ok' },
      { id: 'a5', name: '外部-工单系统统计', type: 'external', method: 'POST', path: 'http://oa.internal/api/ticket/stats', updatedAt: '2026-08-13 11:37', refCount: 0, status: 'warn' },
      { id: 'a6', name: '能耗-空调节能率', type: 'sql', method: 'GET', path: '/data/a6', updatedAt: '2026-08-10 17:50', refCount: 2, status: 'ok' }
    ],

    /* API 编辑表单示例（SQL 生成类） */
    apiDetail: {
      sql: "SELECT d.name AS 站点, p.pressure AS 压力, p.flow AS 流量\nFROM t_pressure p\nJOIN t_station d ON d.id = p.station_id\nWHERE p.region = {{region}}\nORDER BY p.pressure DESC",
      params: [
        { name: 'region', type: 'string', defaultValue: '华东区' },
        { name: 'limit', type: 'number', defaultValue: 20 }
      ],
      testResult: {
        columns: ['站点', '压力', '流量'],
        rows: [
          ['滨江泵站', 0.42, 1280],
          ['城北加压站', 0.38, 960],
          ['高新供水站', 0.35, 1540],
          ['西湖泵站', 0.31, 720]
        ]
      }
    },

    users: [
      { id: 'u1', username: 'admin', role: 'admin', enabled: true, createdAt: '2026-07-01 09:00' },
      { id: 'u2', username: 'wang.lei', role: 'member', enabled: true, createdAt: '2026-07-05 10:24' },
      { id: 'u3', username: 'li.na', role: 'member', enabled: true, createdAt: '2026-07-12 14:31' },
      { id: 'u4', username: 'chenhao', role: 'member', enabled: false, createdAt: '2026-07-20 16:08' },
      { id: 'u5', username: 'zhao.min', role: 'member', enabled: true, createdAt: '2026-08-02 11:45' }
    ],

    kbDocs: [
      { id: 'k1', name: '大屏编辑器操作手册.md', size: '48 KB', updatedAt: '2026-08-16 10:12', status: 'indexed' },
      { id: 'k2', name: '组件配置速查.md', size: '22 KB', updatedAt: '2026-08-16 10:12', status: 'indexed' },
      { id: 'k3', name: 'API配置与数据接入指南.md', size: '35 KB', updatedAt: '2026-08-14 15:40', status: 'indexed' },
      { id: 'k4', name: '常见问题FAQ.md', size: '12 KB', updatedAt: '2026-08-10 09:33', status: 'indexed' }
    ],

    aiSettings: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey: 'sk-****abcd', chatModel: 'qwen-max', embeddingModel: 'text-embedding-v3' },

    /* 编辑器画布示例组件（1920×1080 坐标） */
    canvas: [
      { id: 'c1', type: 'title', name: '智慧水务运营驾驶舱', x: 560, y: 24, w: 800, h: 64 },
      { id: 'c2', type: 'weather', name: '天气标题', x: 1600, y: 24, w: 296, h: 64 },
      { id: 'c3', type: 'kpi', name: '指标卡 · 2×2 趋势', x: 24, y: 112, w: 440, h: 260 },
      { id: 'c4', type: 'line', name: '折线图 · 基础', x: 488, y: 112, w: 700, h: 300 },
      { id: 'c5', type: 'pie', name: '饼图 · 环形', x: 1212, y: 112, w: 420, h: 300 },
      { id: 'c6', type: 'gauge', name: '仪表盘', x: 1656, y: 112, w: 240, h: 300 },
      { id: 'c7', type: 'bar', name: '柱状图 · 分组', x: 24, y: 396, w: 620, h: 320 },
      { id: 'c8', type: 'table', name: '表格 · 滚动', x: 668, y: 436, w: 640, h: 280 },
      { id: 'c9', type: 'combo', name: '组合图 · 双轴', x: 1332, y: 436, w: 564, h: 280 },
      { id: 'c10', type: 'dropdown', name: '下拉框 · 区域', x: 24, y: 740, w: 220, h: 44 },
      { id: 'c11', type: 'button', name: '按钮 · 查询', x: 260, y: 740, w: 120, h: 44 },
      { id: 'c12', type: 'radar', name: '雷达图', x: 24, y: 808, w: 400, h: 248 },
      { id: 'c13', type: 'funnel', name: '漏斗图', x: 448, y: 740, w: 420, h: 316 },
      { id: 'c14', type: 'video', name: '视频 · 泵房监控', x: 892, y: 740, w: 560, h: 316 },
      { id: 'c15', type: 'text', name: '文本 · 备注', x: 1476, y: 740, w: 420, h: 120 }
    ],

    /* 展示页大屏布局（1920×1080，比编辑器示例更完整） */
    displayLayout: [
      { id: 'd1', type: 'time', name: '日期时间', x: 24, y: 20, w: 300, h: 64 },
      { id: 'd2', type: 'title', name: '智慧水务运营驾驶舱', x: 560, y: 16, w: 800, h: 72 },
      { id: 'd3', type: 'weather', name: '天气', x: 1596, y: 20, w: 300, h: 64 },
      { id: 'd4', type: 'kpi', name: '核心指标', x: 24, y: 108, w: 456, h: 300 },
      { id: 'd5', type: 'line', name: '管网压力趋势', x: 504, y: 108, w: 700, h: 300 },
      { id: 'd6', type: 'pie', name: '供水结构', x: 1228, y: 108, w: 330, h: 300 },
      { id: 'd7', type: 'gauge', name: '设备在线率', x: 1582, y: 108, w: 314, h: 300 },
      { id: 'd8', type: 'bar', name: '各站点供水量', x: 24, y: 432, w: 620, h: 320 },
      { id: 'd9', type: 'table', name: '实时告警', x: 668, y: 432, w: 640, h: 320 },
      { id: 'd10', type: 'combo', name: '能耗对比', x: 1332, y: 432, w: 564, h: 320 },
      { id: 'd11', type: 'funnel', name: '工单处理漏斗', x: 24, y: 776, w: 456, h: 280 },
      { id: 'd12', type: 'video', name: '泵房实时监控', x: 504, y: 776, w: 700, h: 280 },
      { id: 'd13', type: 'radar', name: '水质综合评分', x: 1228, y: 776, w: 330, h: 280 },
      { id: 'd14', type: 'text', name: '调度公告', x: 1582, y: 776, w: 314, h: 280 }
    ],

    pages: [
      { id: 'pg1', name: '总览页', children: [] },
      { id: 'pg2', name: '压力监测', children: [{ id: 'pg2-1', name: '分区计量' }] },
      { id: 'pg3', name: '营收分析', children: [] }
    ],

    /* AI 客服固定演示回复 */
    aiReplies: [
      '在编辑器左侧「组件库」选择图表分类，把需要的图表拖入画布即可；拖入后在右侧「数据」页签绑定静态数据或 API。',
      '下拉框联动：先给下拉框和目标组件绑定同一个带占位符参数的 API，下拉框会自动把选中值按同名参数注入并刷新目标组件。',
      '点击工具栏「保存为模板」，填写名称和分类后即可存为个人模板；管理员可在模板库把个人模板提升为公共模板。'
    ]
  };
})();
