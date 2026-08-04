// ローカルタイムで YYYY-MM-DD のキーに変換
const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export type StreakStats = {
  current: number;
  longest: number;
  total: number;
};

// 学習記録の作成日時（created_at）の配列から、連続記録日数などを計算する。
// StreakDialogのヒートマップと、AppBarの常時表示バッジの両方で使う共通ロジック
export const calculateStreakStats = (dates: string[]): StreakStats => {
  const countMap = new Map<string, number>();
  dates.forEach((d) => {
    const t = new Date(d);
    if (isNaN(t.getTime())) return;
    countMap.set(toKey(t), (countMap.get(toKey(t)) || 0) + 1);
  });

  // 現在の連続日数：今日（なければ昨日）から遡って連続している日数
  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!countMap.has(toKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1); // 今日未記録でも昨日までの連続は保持
  }
  while (countMap.has(toKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // 最長連続日数：記録のある日付を並べて最大の連続を数える
  const sortedKeys = Array.from(countMap.keys()).sort();
  let longest = 0;
  let run = 0;
  let prevDate: Date | null = null;
  sortedKeys.forEach((k) => {
    const d = new Date(k + "T00:00:00");
    if (prevDate) {
      const diff = Math.round((d.getTime() - prevDate.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prevDate = d;
  });

  const total = dates.filter((d) => !isNaN(new Date(d).getTime())).length;

  return { current, longest, total };
};
