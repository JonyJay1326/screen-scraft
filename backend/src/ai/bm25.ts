/** 轻量 BM25 关键词检索（无 embedding 时降级） */

export interface TextDoc {
  id: string;
  text: string;
}

/** 中英混合切词：英文单词 + 汉字二元 */
export function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  const hans = text.replace(/[^\u4e00-\u9fff]/g, '');
  const grams: string[] = [];
  for (let i = 0; i < hans.length - 1; i += 1) {
    grams.push(hans.slice(i, i + 2));
  }
  if (hans.length === 1) {
    grams.push(hans);
  }
  return [...words, ...grams];
}

/** 对查询返回按 BM25 排序的文档 */
export function bm25Search(query: string, docs: TextDoc[], topK = 4): TextDoc[] {
  const qTokens = tokenize(query);
  if (!qTokens.length || !docs.length) {
    return docs.slice(0, topK);
  }
  const tf = docs.map((doc) => {
    const tokens = tokenize(doc.text);
    const map = new Map<string, number>();
    tokens.forEach((tok) => map.set(tok, (map.get(tok) ?? 0) + 1));
    return { doc, map, len: tokens.length };
  });
  const avgLen = tf.reduce((sum, item) => sum + item.len, 0) / tf.length || 1;
  const df = new Map<string, number>();
  qTokens.forEach((tok) => {
    df.set(tok, tf.filter((item) => item.map.has(tok)).length);
  });
  const k1 = 1.5;
  const b = 0.75;
  const n = docs.length;
  const scored = tf.map((item) => {
    let score = 0;
    qTokens.forEach((tok) => {
      const f = item.map.get(tok) ?? 0;
      if (!f) {
        return;
      }
      const nq = df.get(tok) ?? 0;
      const idf = Math.log(1 + (n - nq + 0.5) / (nq + 0.5));
      score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * item.len) / avgLen));
    });
    return { doc: item.doc, score };
  });
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.doc);
}

/** 余弦相似度 */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) {
    return 0;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
