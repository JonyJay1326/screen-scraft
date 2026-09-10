/**
 * 组件库预览图生成：
 * - 图表：ECharts SSR（默认样式 + mock）
 * - 指标卡/表格：真实布局 SVG
 * - 其余：示意 SVG
 * 用法：pnpm previews
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = join(root, 'frontend');
const outDir = join(frontendRoot, 'public/previews');

/** 从 frontend 依赖解析 vite（根目录未安装 vite） */
const requireFromFrontend = createRequire(join(frontendRoot, 'package.json'));
const { createServer } = await import(pathToFileURL(requireFromFrontend.resolve('vite')).href);

const glyphIds = [
  'media-image',
  'media-video',
  'control-button',
  'control-imageButton',
  'control-hotspot',
  'control-dropdown',
  'control-text',
];

/** 按族画非图表示意形状 */
function glyph(id, accent, muted) {
  if (id === 'media-image') {
    return `<rect x="28" y="20" width="104" height="64" rx="6" fill="${muted}" opacity=".3"/><polygon points="40,72 64,44 84,60 96,50 124,72" fill="${accent}" opacity=".7"/>`;
  }
  if (id === 'media-video') {
    return `<rect x="28" y="20" width="104" height="64" rx="6" fill="${muted}" opacity=".25"/><polygon points="70,40 70,64 96,52" fill="${accent}"/>`;
  }
  if (id.startsWith('control-button') || id === 'control-imageButton') {
    return `<rect x="36" y="36" width="88" height="32" rx="6" fill="${accent}"/><text x="80" y="57" text-anchor="middle" fill="#fff" font-size="12">查询</text>`;
  }
  if (id === 'control-hotspot') {
    return `<rect x="40" y="24" width="80" height="56" rx="4" fill="${accent}" fill-opacity=".2" stroke="${accent}" stroke-dasharray="4 3"/>`;
  }
  if (id === 'control-dropdown') {
    return `<rect x="24" y="36" width="112" height="28" rx="6" fill="none" stroke="${accent}"/><text x="36" y="55" fill="${muted}" font-size="12">全部区域</text><polyline points="120,46 126,52 132,46" fill="none" stroke="${accent}"/>`;
  }
  return `<text x="24" y="58" fill="${muted}" font-size="12">文本组件</text>`;
}

/** 生成示意 SVG */
function glyphSvg(id, theme) {
  const dark = theme === 'dark';
  const bg = dark ? '#0D1730' : '#F4F7FB';
  const accent = '#2F7FF7';
  const muted = dark ? '#9FB3D1' : '#6B7280';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">
  <rect width="160" height="96" rx="8" fill="${bg}"/>
  ${glyph(id, accent, muted)}
</svg>
`;
}

/**
 * 用 ECharts SSR 按模板默认样式渲染真实预览 SVG
 * @param {import('echarts')} echarts
 * @param {(input: object) => object} buildChartOption
 * @param {object} meta
 * @param {'dark'|'light'} theme
 */
function chartSvg(echarts, buildChartOption, meta, theme) {
  const dark = theme === 'dark';
  const bg = dark ? '#0D1730' : '#F4F7FB';
  const style = meta.defaultStyle[theme] ?? {};
  const option = buildChartOption({
    templateId: meta.id,
    style,
    data: meta.defaultData,
    protocol: meta.dataProtocol,
    forPreview: true,
  });
  option.backgroundColor = bg;

  const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width: 320,
    height: 160,
  });
  chart.setOption(option, true);
  let svg = chart.renderToSVGString();
  chart.dispose();

  if (svg.includes('<svg ')) {
    svg = svg.replace('<svg ', '<svg rx="8" ry="8" ');
  }
  if (!svg.startsWith('<?xml')) {
    svg = `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`;
  }
  return svg;
}

/** 主流程 */
async function main() {
  mkdirSync(outDir, { recursive: true });

  const server = await createServer({
    configFile: join(frontendRoot, 'vite.config.ts'),
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const echarts = await server.ssrLoadModule('echarts');
    const { listMetas } = await server.ssrLoadModule('/src/registry/meta-lookup.ts');
    const { buildChartOption } = await server.ssrLoadModule('/src/registry/chart-option.ts');
    const { buildWidgetPreviewSvg, isWidgetPreviewId } = await server.ssrLoadModule(
      '/src/registry/widget-preview-svg.ts',
    );

    const metas = listMetas();
    let chartCount = 0;
    let widgetCount = 0;

    for (const meta of metas) {
      if (meta.id.startsWith('chart-')) {
        writeFileSync(join(outDir, `${meta.id}.dark.svg`), chartSvg(echarts, buildChartOption, meta, 'dark'));
        writeFileSync(join(outDir, `${meta.id}.light.svg`), chartSvg(echarts, buildChartOption, meta, 'light'));
        chartCount += 1;
        continue;
      }

      if (isWidgetPreviewId(meta.id)) {
        for (const theme of /** @type {const} */ (['dark', 'light'])) {
          const svg = buildWidgetPreviewSvg({
            id: meta.id,
            theme,
            style: meta.defaultStyle[theme] ?? {},
            data: meta.defaultData,
          });
          if (svg) {
            writeFileSync(join(outDir, `${meta.id}.${theme}.svg`), svg);
          }
        }
        widgetCount += 1;
      }
    }

    for (const id of glyphIds) {
      writeFileSync(join(outDir, `${id}.dark.svg`), glyphSvg(id, 'dark'));
      writeFileSync(join(outDir, `${id}.light.svg`), glyphSvg(id, 'light'));
    }

    console.log(
      `generated ${chartCount * 2} chart + ${widgetCount * 2} widget + ${glyphIds.length * 2} glyph previews`,
    );
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
