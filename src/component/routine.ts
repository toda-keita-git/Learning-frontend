// 「習慣リスト」を、メモごとに自由な日数で設定した固定ペースの繰り返しやることとして管理する。
// メモに設定したreview_interval_days（何日おきか）はバックエンド側で保存されるが、
// 「いつ最後にやったか」は端末ローカルの体験で十分なため、SRSと同じくlocalStorageに持つ
// （既知の制約: 複数端末間では同期されない）。

const storageKey = (userId: number | null | undefined) => `routineDone_${userId ?? "anon"}`;

// 日付はすべて端末のローカル時刻で扱う。
// 以前は toISOString().slice(0, 10)（＝UTC）で日付キーを作っていたが、
// カレンダー（ScheduleView）・期限（deadline.ts）・継続日数（streakStats.ts）は
// いずれもローカル時刻で日付を出しているため、UTCとの時差ぶんだけ食い違っていた。
// 日本（UTC+9）では 0時〜9時 のあいだ「アプリの中の今日」が前日のままになり、
// 朝に開くと毎日の習慣がまだ期日になっていない、という状態が起きていた。
const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// "YYYY-MM-DD" をローカルの0時として解釈する（new Date("YYYY-MM-DD") はUTC0時になるため使わない）
const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const todayStr = (): string => toDateKey(new Date());

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
  const due = parseDateKey(last);
  due.setDate(due.getDate() + intervalDays);
  return toDateKey(due) <= todayStr();
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
  const due = parseDateKey(last);
  due.setDate(due.getDate() + intervalDays);
  const today = parseDateKey(todayStr());
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
  const anchor = parseDateKey(last ?? todayStr());
  if (!last) {
    // 未実施なら起点そのもの（今日）を初回の期日として含める
  } else {
    anchor.setDate(anchor.getDate() + intervalDays);
  }
  // 呼び出し側（ScheduleView）はローカル日付のキーを渡してくるので、同じ基準で解釈する
  const start = parseDateKey(rangeStart);
  const end = parseDateKey(rangeEnd);
  const occurrences: string[] = [];
  const cursor = new Date(anchor);
  // 範囲より前なら、周期を進めて範囲内まで早送りする
  while (cursor < start) {
    cursor.setDate(cursor.getDate() + intervalDays);
  }
  while (cursor <= end) {
    occurrences.push(toDateKey(cursor));
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
