import { describe, expect, it } from 'vitest';
import { bm25Search } from '../ai/bm25';

describe('BM25', () => {
  it('能命中手册关键词', () => {
    const docs = [
      { id: '1', text: '如何添加折线图：在组件库点击折线图样式1即可添加到画布中央。' },
      { id: '2', text: '下拉框联动：选中值按同名参数注入目标组件 API。' },
    ];
    const hit = bm25Search('怎么添加折线图', docs, 1);
    expect(hit[0].id).toBe('1');
  });
});
