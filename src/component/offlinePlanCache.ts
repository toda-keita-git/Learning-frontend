// プラン・メモの最新の取得結果をブラウザに保存しておき、通信が不安定なときや
// オフライン時でも前回の内容を表示できるようにする簡易キャッシュ。
// ゲストモード（localStorageのみで完結）では実質使われないが、害もないのでそのまま共通で使う。
import type { PlanDataBundle } from "./planDataSource";

type CachedBundle = PlanDataBundle & { ts: number };

const key = (userId: number | null | undefined) => `planOfflineCache_${userId ?? "anon"}`;

export const savePlanCache = (userId: number | null | undefined, bundle: PlanDataBundle): void => {
  try {
    localStorage.setItem(key(userId), JSON.stringify({ ...bundle, ts: Date.now() }));
  } catch {
    // 容量超過などは無視（オフライン表示は"あれば便利"の位置づけ）
  }
};

export const loadPlanCache = (userId: number | null | undefined): CachedBundle | null => {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.plans) &&
      Array.isArray(parsed.notes) &&
      Array.isArray(parsed.categories) &&
      Array.isArray(parsed.tagOptions) &&
      typeof parsed.ts === "number"
    ) {
      return parsed as CachedBundle;
    }
    return null;
  } catch {
    return null;
  }
};
