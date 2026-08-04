// 「ToDoリスト」を、メモごとに自由な日数で設定した固定ペースの繰り返しやることとして管理する。
// メモに設定したreview_interval_days（何日おきか）はバックエンド側で保存されるが、
// 「いつ最後にやったか」は端末ローカルの体験で十分なため、SRSと同じくlocalStorageに持つ
// （既知の制約: 複数端末間では同期されない）。

const storageKey = (userId: number | null | undefined) => `routineDone_${userId ?? "anon"}`;

const todayStr = (): string => new Date().toISOString().slice(0, 10);

const loadAll = (userId: number | null | undefined): Record<number, string> => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveAll = (userId: number | null | undefined, all: Record<number, string>) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(all));
  } catch {
    // 容量超過などは無視（やることの期日が多少ずれても致命的ではない）
  }
};

export const getLastDone = (userId: number | null | undefined, noteId: number): string | null =>
  loadAll(userId)[noteId] ?? null;

// intervalDaysがnull（繰り返し設定なし）なら対象外。一度もやっていなければ即対象にする
export const isRoutineDue = (
  userId: number | null | undefined,
  noteId: number,
  intervalDays: number | null
): boolean => {
  if (!intervalDays || intervalDays < 1) return false;
  const last = getLastDone(userId, noteId);
  if (!last) return true;
  const due = new Date(last);
  due.setDate(due.getDate() + intervalDays);
  return due.toISOString().slice(0, 10) <= todayStr();
};

export const markRoutineDone = (userId: number | null | undefined, noteId: number): void => {
  const all = loadAll(userId);
  all[noteId] = todayStr();
  saveAll(userId, all);
};

// チェック済みを手動で取り消し、即座に「未チェック」へ戻す
export const clearRoutineDone = (userId: number | null | undefined, noteId: number): void => {
  const all = loadAll(userId);
  delete all[noteId];
  saveAll(userId, all);
};

// 作成・編集ダイアログのプリセット
export const ROUTINE_PRESETS: { label: string; days: number }[] = [
  { label: "毎日", days: 1 },
  { label: "週1", days: 7 },
  { label: "月1", days: 30 },
];
