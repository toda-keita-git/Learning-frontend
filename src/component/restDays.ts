import { getHolidayName } from "./japaneseHolidays";

// カレンダーで背景色を付ける「休み」の定義。人によって休みは違う（土日休みとは
// 限らない）ため、曜日・日付単位で自分で決められるようにしている。
// 端末ごとの見た目の設定なのでlocalStorageに持つ（既知の制約: 端末間で同期しない）。

export type RestDayConfig = {
  // 休みにする曜日（0=日 … 6=土）
  weekdays: number[];
  // 日本の祝日を休みに含めるか
  useHolidays: boolean;
  // 上のルールに関係なく休みにする日（YYYY-MM-DD）
  extraDates: string[];
  // 上のルールで休みになる日のうち、休みから外す日（出勤日など）
  workDates: string[];
};

export const DEFAULT_REST_DAYS: RestDayConfig = {
  weekdays: [0, 6],
  useHolidays: true,
  extraDates: [],
  workDates: [],
};

const STORAGE_KEY = "restDayConfig";

export const loadRestDayConfig = (): RestDayConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REST_DAYS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_REST_DAYS;
    return {
      weekdays: Array.isArray(parsed.weekdays) ? parsed.weekdays.filter((n: unknown) => typeof n === "number") : DEFAULT_REST_DAYS.weekdays,
      useHolidays: typeof parsed.useHolidays === "boolean" ? parsed.useHolidays : DEFAULT_REST_DAYS.useHolidays,
      extraDates: Array.isArray(parsed.extraDates) ? parsed.extraDates.filter((s: unknown) => typeof s === "string") : [],
      workDates: Array.isArray(parsed.workDates) ? parsed.workDates.filter((s: unknown) => typeof s === "string") : [],
    };
  } catch {
    return DEFAULT_REST_DAYS;
  }
};

export const saveRestDayConfig = (config: RestDayConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 容量超過などは無視（休みの色が付かないだけで、記録には影響しない）
  }
};

export type RestDayInfo = {
  isRest: boolean;
  // 背景色の系統。日曜・祝日は赤系、土曜は青系、自分で足した休みは中立色にして
  // 「なぜ休みなのか」が色でも分かるようにする
  tone: "sunday" | "saturday" | "holiday" | "custom" | null;
  holidayName: string | null;
};

export const getRestDayInfo = (date: Date, dateKey: string, config: RestDayConfig): RestDayInfo => {
  const holidayName = config.useHolidays ? getHolidayName(dateKey) : null;

  // 「休みから外す日」は、どのルールよりも優先する
  if (config.workDates.includes(dateKey)) {
    return { isRest: false, tone: null, holidayName };
  }
  if (config.extraDates.includes(dateKey)) {
    return { isRest: true, tone: "custom", holidayName };
  }
  if (holidayName) {
    return { isRest: true, tone: "holiday", holidayName };
  }
  const dow = date.getDay();
  if (config.weekdays.includes(dow)) {
    return { isRest: true, tone: dow === 0 ? "sunday" : dow === 6 ? "saturday" : "custom", holidayName };
  }
  return { isRest: false, tone: null, holidayName };
};
