// Anki風の間隔反復(SM-2ベースの簡易版)アルゴリズム。
// 「わかった/まだ」の2択評価から、次に復習すべき日をローカルに計算・保存する。
// バックエンドのスキーマ変更なしで導入するため、スケジューリング情報はlocalStorageに保存する
// （既知の制約: 複数端末間では同期されない）。

export interface SrsCard {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string; // yyyy-mm-dd
}

const DEFAULT_CARD: Omit<SrsCard, "nextReviewDate"> = {
  intervalDays: 0,
  easeFactor: 2.5,
  repetitions: 0,
};

const storageKey = (userId: number | null | undefined) => `srsCards_${userId ?? "anon"}`;

const todayStr = (): string => new Date().toISOString().slice(0, 10);

const loadAll = (userId: number | null | undefined): Record<number, SrsCard> => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveAll = (userId: number | null | undefined, all: Record<number, SrsCard>) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(all));
  } catch {
    // 容量超過などは無視（復習スケジュールが多少ずれても致命的ではない）
  }
};

// まだ一度も評価していない記録は「今日が期日」の初期カードとして扱う（＝すぐ復習対象になる）
export const getCard = (userId: number | null | undefined, id: number): SrsCard => {
  const all = loadAll(userId);
  return all[id] ?? { ...DEFAULT_CARD, nextReviewDate: todayStr() };
};

export const isDue = (userId: number | null | undefined, id: number): boolean =>
  getCard(userId, id).nextReviewDate <= todayStr();

// 「わかった」→ correct: true / 「まだ」→ correct: false
export const reviewCard = (
  userId: number | null | undefined,
  id: number,
  correct: boolean
): SrsCard => {
  const all = loadAll(userId);
  const current = all[id] ?? { ...DEFAULT_CARD, nextReviewDate: todayStr() };

  let { intervalDays, easeFactor, repetitions } = current;

  if (!correct) {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    repetitions += 1;
    easeFactor = Math.min(3.0, easeFactor + 0.05);
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  const next = new Date();
  next.setDate(next.getDate() + intervalDays);

  const updated: SrsCard = {
    intervalDays,
    easeFactor,
    repetitions,
    nextReviewDate: next.toISOString().slice(0, 10),
  };
  all[id] = updated;
  saveAll(userId, all);
  return updated;
};

export const getDueCount = (
  userId: number | null | undefined,
  ids: number[]
): number => ids.filter((id) => isDue(userId, id)).length;
