/**
 * 将腾讯天气文案映射为 emoji。
 * 按关键词优先级匹配（雨雪雷雾等优先于晴/云）。
 */
export function weatherEmoji(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) {
    return '🌡️';
  }
  if (/雷/.test(raw)) {
    return '⛈️';
  }
  if (/冰雹/.test(raw)) {
    return '🌨️';
  }
  if (/雨夹雪|冻雨/.test(raw)) {
    return '🌨️';
  }
  if (/暴雨|大暴雨|特大暴雨/.test(raw)) {
    return '🌧️';
  }
  if (/雨|阵雨|毛毛雨/.test(raw)) {
    return '🌦️';
  }
  if (/暴雪|大雪/.test(raw)) {
    return '❄️';
  }
  if (/雪/.test(raw)) {
    return '🌨️';
  }
  if (/沙|尘|扬沙/.test(raw)) {
    return '🌫️';
  }
  if (/霾|雾/.test(raw)) {
    return '🌁';
  }
  if (/阴/.test(raw)) {
    return '☁️';
  }
  if (/多云|少云|晴间多云/.test(raw)) {
    return '⛅';
  }
  if (/晴/.test(raw)) {
    return '☀️';
  }
  if (/风|台风/.test(raw)) {
    return '🌬️';
  }
  return '🌡️';
}
