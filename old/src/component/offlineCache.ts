// 学習記録などをブラウザに保存しておき、オフラインや
// Renderのコールドスタート中でも前回の内容を表示できるようにする簡易キャッシュ。
// iOS・Android両方のブラウザで動作する localStorage を使用。

type CachePayload = {
  learnings: any[];
  tags: any[];
  categories: any[];
};

const key = (userId: number | null | undefined) =>
  `learningCache_${userId ?? "anon"}`;

// 取得したデータをキャッシュに保存する（失敗しても致命的でないので握りつぶす）
export const saveLearningCache = (
  userId: number | null | undefined,
  payload: CachePayload
) => {
  try {
    localStorage.setItem(
      key(userId),
      JSON.stringify({ ...payload, ts: Date.now() })
    );
  } catch {
    // 容量超過などは無視（オフライン表示は"あれば便利"の位置づけ）
  }
};

// キャッシュを読み込む。無ければ null。
export const loadLearningCache = (
  userId: number | null | undefined
): (CachePayload & { ts: number }) | null => {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.learnings) &&
      Array.isArray(parsed.tags) &&
      Array.isArray(parsed.categories)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};
