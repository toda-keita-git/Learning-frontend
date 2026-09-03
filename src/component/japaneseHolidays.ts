// 日本の祝日をその場で計算する（外部APIに依存しない）。
// カレンダーで「休み」に背景色を付けるためだけに使うので、内閣府が公表する
// 祝日法の規則（固定日・ハッピーマンデー・春分／秋分・振替休日・国民の休日）を
// そのまま実装している。春分／秋分の近似式は1980〜2099年で正しい値になる。

const toKey = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// 指定した月の「第n週のw曜日」の日付を返す（ハッピーマンデー用）
const nthWeekday = (year: number, month: number, nth: number, weekday: number): number => {
  const firstDow = new Date(year, month - 1, 1).getDay();
  return 1 + ((weekday - firstDow + 7) % 7) + (nth - 1) * 7;
};

const vernalEquinoxDay = (year: number): number =>
  Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));

const autumnEquinoxDay = (year: number): number =>
  Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));

// 年ごとの計算結果は変わらないので、一度作ったらそのまま使い回す
const cache = new Map<number, Map<string, string>>();

const buildYear = (year: number): Map<string, string> => {
  const base = new Map<string, string>();
  const put = (month: number, day: number, name: string) => base.set(toKey(year, month, day), name);

  put(1, 1, "元日");
  put(1, nthWeekday(year, 1, 2, 1), "成人の日");
  put(2, 11, "建国記念の日");
  if (year >= 2020) put(2, 23, "天皇誕生日");
  put(3, vernalEquinoxDay(year), "春分の日");
  put(4, 29, "昭和の日");
  put(5, 3, "憲法記念日");
  put(5, 4, "みどりの日");
  put(5, 5, "こどもの日");
  put(7, nthWeekday(year, 7, 3, 1), "海の日");
  if (year >= 2016) put(8, 11, "山の日");
  put(9, nthWeekday(year, 9, 3, 1), "敬老の日");
  put(9, autumnEquinoxDay(year), "秋分の日");
  put(10, nthWeekday(year, 10, 2, 1), year >= 2020 ? "スポーツの日" : "体育の日");
  put(11, 3, "文化の日");
  put(11, 23, "勤労感謝の日");

  const result = new Map(base);

  // 振替休日：祝日が日曜に当たったら、その後の最初の平日を休みにする
  for (const [key] of base) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getDay() !== 0) continue;
    const next = new Date(date);
    do {
      next.setDate(next.getDate() + 1);
    } while (result.has(toKey(next.getFullYear(), next.getMonth() + 1, next.getDate())));
    result.set(toKey(next.getFullYear(), next.getMonth() + 1, next.getDate()), "振替休日");
  }

  // 国民の休日：祝日に挟まれた平日（9月のシルバーウィークで発生する）
  for (const [key] of base) {
    const [y, m, d] = key.split("-").map(Number);
    const between = new Date(y, m - 1, d + 1);
    const after = new Date(y, m - 1, d + 2);
    const betweenKey = toKey(between.getFullYear(), between.getMonth() + 1, between.getDate());
    const afterKey = toKey(after.getFullYear(), after.getMonth() + 1, after.getDate());
    if (!base.has(afterKey) || result.has(betweenKey) || between.getDay() === 0) continue;
    result.set(betweenKey, "国民の休日");
  }

  return result;
};

// 祝日ならその名前を、そうでなければnullを返す（キーは"YYYY-MM-DD"）
export const getHolidayName = (dateKey: string): string | null => {
  const year = Number(dateKey.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  let map = cache.get(year);
  if (!map) {
    map = buildYear(year);
    cache.set(year, map);
  }
  return map.get(dateKey) ?? null;
};
