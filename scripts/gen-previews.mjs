import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'frontend/public/previews');

const ids = [
  ...[1, 2, 3, 4, 5].map((n) => `chart-line-${n}`),
  ...[1, 2, 3, 4, 5].map((n) => `chart-bar-${n}`),
  'chart-pie-1',
  'chart-pie-1p',
  'chart-pie-2',
  'chart-pie-3',
  'chart-pie-4',
  ...[1, 2, 3, 4, 5].map((n) => `chart-combo-${n}`),
  ...[1, 2, 3, 4, 5].map((n) => `chart-funnel-${n}`),
  ...[1, 2, 3, 4, 5].map((n) => `chart-radar-${n}`),
  ...[1, 2, 3, 4, 5].map((n) => `chart-gauge-${n}`),
  'kpi-card-1',
  'kpi-card-2',
  'kpi-card-2p',
  'kpi-card-3',
  'kpi-card-3p',
  'kpi-card-5',
  'kpi-card-5p',
  'kpi-card-8',
  'kpi-card-9',
  'kpi-card-10',
  'kpi-card-11',
  'kpi-card-list',
  'table-list',
  'table-alarm',
  'weather-1',
  'weather-2',
  ...[1, 2, 3, 4, 5].map((n) => `border-${n}`),
  'media-image',
  'media-video',
  'control-button',
  'control-imageButton',
  'control-hotspot',
  'control-dropdown',
  'control-text',
];

/** 按族画简易预览形状 */
function glyph(id, accent, muted) {
  if (id.startsWith('chart-line') || id.startsWith('chart-combo')) {
    return `<polyline fill="none" stroke="${accent}" stroke-width="3" points="16,70 40,48 64,56 88,28 112,36 140,18"/><polyline fill="none" stroke="${muted}" stroke-width="2" points="16,78 40,62 64,68 88,50 112,58 140,42"/>`;
  }
  if (id.startsWith('chart-bar')) {
    return `<rect x="22" y="40" width="14" height="44" rx="2" fill="${accent}"/><rect x="44" y="28" width="14" height="56" rx="2" fill="${muted}"/><rect x="66" y="48" width="14" height="36" rx="2" fill="${accent}"/><rect x="88" y="22" width="14" height="62" rx="2" fill="${muted}"/><rect x="110" y="36" width="14" height="48" rx="2" fill="${accent}"/>`;
  }
  if (id.startsWith('chart-pie')) {
    return `<circle cx="80" cy="52" r="28" fill="none" stroke="${accent}" stroke-width="14" stroke-dasharray="50 120"/><circle cx="80" cy="52" r="28" fill="none" stroke="${muted}" stroke-width="14" stroke-dasharray="30 140" stroke-dashoffset="-50"/>`;
  }
  if (id.startsWith('chart-funnel')) {
    return `<polygon points="30,18 130,18 110,40 50,40" fill="${accent}"/><polygon points="50,44 110,44 98,66 62,66" fill="${muted}"/><polygon points="62,70 98,70 88,90 72,90" fill="${accent}"/>`;
  }
  if (id.startsWith('chart-radar')) {
    return `<polygon points="80,16 118,40 104,84 56,84 42,40" fill="none" stroke="${muted}" stroke-width="1"/><polygon points="80,28 104,44 96,72 64,72 56,44" fill="${accent}" fill-opacity=".35" stroke="${accent}"/>`;
  }
  if (id.startsWith('chart-gauge')) {
    return `<path d="M28 72 A52 52 0 0 1 132 72" fill="none" stroke="${muted}" stroke-width="10"/><path d="M28 72 A52 52 0 0 1 110 32" fill="none" stroke="${accent}" stroke-width="10"/><circle cx="80" cy="72" r="6" fill="${accent}"/>`;
  }
  if (id.startsWith('kpi')) {
    return `<text x="24" y="42" fill="${muted}" font-size="11">指标</text><text x="24" y="78" fill="${accent}" font-size="28" font-weight="700">96.4%</text>`;
  }
  if (id.startsWith('table')) {
    return `<rect x="20" y="22" width="120" height="14" fill="${accent}" opacity=".5"/><rect x="20" y="40" width="120" height="12" fill="${muted}" opacity=".25"/><rect x="20" y="56" width="120" height="12" fill="${muted}" opacity=".15"/><rect x="20" y="72" width="120" height="12" fill="${muted}" opacity=".25"/>`;
  }
  if (id.startsWith('weather')) {
    return `<circle cx="40" cy="40" r="14" fill="#F59E0B"/><text x="64" y="48" fill="${accent}" font-size="16" font-weight="600">29°C</text><text x="24" y="80" fill="${muted}" font-size="11">多云 · 杭州</text>`;
  }
  if (id.startsWith('border')) {
    return `<rect x="18" y="16" width="124" height="72" rx="6" fill="none" stroke="${accent}" stroke-width="2"/><rect x="18" y="16" width="10" height="10" fill="${accent}"/><rect x="132" y="16" width="10" height="10" fill="${accent}"/><rect x="18" y="78" width="10" height="10" fill="${accent}"/><rect x="132" y="78" width="10" height="10" fill="${accent}"/>`;
  }
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

/** 生成一张 160×96 的 SVG 预览 */
function svgFor(id, theme) {
  const dark = theme === 'dark';
  const bg = dark ? '#0D1730' : '#F4F7FB';
  const accent = '#2F7FF7';
  const muted = dark ? '#9FB3D1' : '#6B7280';
  const label = dark ? '#E8EEF7' : '#1F2937';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">
  <rect width="160" height="96" rx="8" fill="${bg}"/>
  ${glyph(id, accent, muted)}
  <text x="8" y="92" fill="${label}" font-size="8" font-family="sans-serif">${id}</text>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
for (const id of ids) {
  writeFileSync(join(outDir, `${id}.dark.svg`), svgFor(id, 'dark'));
  writeFileSync(join(outDir, `${id}.light.svg`), svgFor(id, 'light'));
}
console.log(`generated ${ids.length * 2} previews for ${ids.length} templates`);
