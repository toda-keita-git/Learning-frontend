// AIを使わない簡易的な関連メモサジェスト。
// タグの重なり・カテゴリの一致・タイトルの共通語から類似度を計算する。

interface RelatableItem {
  id: number;
  title: string;
  category_name: string;
  tags: string[];
}

// タイトルを簡易的に単語へ分割する（日本語の形態素解析はせず、区切り文字ベース）
const tokenize = (title: string): string[] =>
  title
    .split(/[\s、。・,/()（）\-_:：]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

export function findRelatedItems<T extends RelatableItem>(
  current: T,
  pool: T[],
  limit = 3
): T[] {
  const currentTokens = new Set(tokenize(current.title));

  return pool
    .filter((item) => item.id !== current.id)
    .map((item) => {
      const sharedTags = item.tags.filter((t) => current.tags.includes(t)).length;
      const sameCategory = item.category_name === current.category_name ? 1 : 0;
      const sharedTokens = tokenize(item.title).filter((t) => currentTokens.has(t)).length;
      const score = sharedTags * 3 + sameCategory + sharedTokens;
      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}
