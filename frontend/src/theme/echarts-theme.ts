import * as echarts from 'echarts';

let registered = false;

/** 注册 ds-dark / ds-light 主题包（全局一次） */
export function ensureEchartsThemes(): void {
  if (registered) {
    return;
  }
  echarts.registerTheme('ds-dark', {
    backgroundColor: 'transparent',
    textStyle: { color: '#9FB3D1' },
  });
  echarts.registerTheme('ds-light', {
    backgroundColor: 'transparent',
    textStyle: { color: '#6B7280' },
  });
  registered = true;
}

/** 按组件主题取 ECharts 主题名 */
export function echartsThemeName(theme: 'dark' | 'light'): string {
  return theme === 'light' ? 'ds-light' : 'ds-dark';
}
