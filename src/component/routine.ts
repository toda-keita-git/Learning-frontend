// 「習慣リスト」を、メモごとに自由な日数で設定した固定ペースの繰り返しやることとして管理する。
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

// 次の期日まであと何日か。まだ一度もやっていなければ0（即座に対象）。
// intervalDaysが未設定なら対象外としてnullを返す
export const getRemainingDays = (
  userId: number | null | undefined,
  noteId: number,
  intervalDays: number | null
): number | null => {
  if (!intervalDays || intervalDays < 1) return null;
  const last = getLastDone(userId, noteId);
  if (!last) return 0;
  const due = new Date(last);
  due.setDate(due.getDate() + intervalDays);
  const today = new Date(todayStr());
  return Math.round((due.getTime() - today.getTime()) / 86400000);
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

// 指定範囲（開始日～終了日、両端含む）に入る「次の期日」を、intervalDaysおきに
// 機械的に投影して返す（YYYY-MM-DD文字列の配列）。過去の完了実績までは遡らず、
// 「最後にやった日（無ければ今日）」を起点に、そこから先の周期をカレンダーに
// 重ねて見せるための単純な予測。実際に毎回その通りにやる保証はない
export const getRoutineOccurrencesInRange = (
  userId: number | null | undefined,
  noteId: number,
  intervalDays: number | null,
  rangeStart: string,
  rangeEnd: string
): string[] => {
  if (!intervalDays || intervalDays < 1) return [];
  const last = getLastDone(userId, noteId);
  const anchor = last ? new Date(last) : new Date(todayStr());
  if (!last) {
    // 未実施なら起点そのもの（今日）を初回の期日として含める
  } else {
    anchor.setDate(anchor.getDate() + intervalDays);
  }
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const occurrences: string[] = [];
  const cursor = new Date(anchor);
  // 範囲より前なら、周期を進めて範囲内まで早送りする
  while (cursor < start) {
    cursor.setDate(cursor.getDate() + intervalDays);
  }
  while (cursor <= end) {
    occurrences.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + intervalDays);
  }
  return occurrences;
};

// 作成・編集ダイアログのプリセット
export const ROUTINE_PRESETS: { label: string; days: number }[] = [
  { label: "毎日", days: 1 },
  { label: "週1", days: 7 },
  { label: "月1", days: 30 },
];
