import React, { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";

type Props = {
  open: boolean;
  onClose: () => void;
  // 学習記録の作成日時（created_at）の配列
  dates: string[];
};

const WEEKS = 18; // 表示する週数（およそ4か月分）

// ローカルタイムで YYYY-MM-DD のキーに変換
const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

/**
 * 学習の記録を、GitHubの「草」風のヒートマップで可視化するダイアログ。
 * 連続記録（ストリーク）でモチベーションを保つのが狙い。
 */
export const StreakDialog: React.FC<Props> = ({ open, onClose, dates }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { weeks, current, longest, total, monthCols } = useMemo(() => {
    // 日付ごとの記録件数を集計
    const countMap = new Map<string, number>();
    dates.forEach((d) => {
      const t = new Date(d);
      if (isNaN(t.getTime())) return;
      const key = toKey(t);
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });

    // 表示範囲：今日から遡り、開始日はその週の日曜に揃える
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (WEEKS * 7 - 1));
    start.setDate(start.getDate() - start.getDay());

    const days: { key: string; date: Date; count: number }[] = [];
    for (
      let d = new Date(start);
      d.getTime() <= end.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      const key = toKey(d);
      days.push({ key, date: new Date(d), count: countMap.get(key) || 0 });
    }

    // 7日ずつ（日曜始まり）の週の列に分割
    const weeks: { key: string; date: Date; count: number }[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // 各週の先頭に、月が変わったら月ラベルを付ける
    const monthCols: (string | null)[] = weeks.map((w, i) => {
      const first = w[0];
      if (!first) return null;
      const m = first.date.getMonth();
      const prev =
        i > 0 && weeks[i - 1][0] ? weeks[i - 1][0].date.getMonth() : -1;
      return m !== prev ? MONTH_LABELS[m] : null;
    });

    // 現在の連続日数：今日（なければ昨日）から遡って連続している日数
    let current = 0;
    const cursor = new Date(end);
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
        const diff = Math.round(
          (d.getTime() - prevDate.getTime()) / 86400000
        );
        run = diff === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > longest) longest = run;
      prevDate = d;
    });

    const total = dates.filter((d) => !isNaN(new Date(d).getTime())).length;

    return { weeks, current, longest, total, monthCols };
  }, [dates]);

  // 件数に応じた「草」の濃さ
  const cellColor = (count: number) => {
    if (count <= 0) return isDark ? "#334155" : "#e5e7eb";
    if (count === 1) return "#c7d2fe";
    if (count === 2) return "#a5b4fc";
    if (count === 3) return "#818cf8";
    return "#4f46e5";
  };

  const CELL = 13;
  const GAP = 3;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalFireDepartmentIcon sx={{ color: "#f97316" }} /> 学習の記録
      </DialogTitle>
      <DialogContent dividers>
        {/* サマリー：現在の連続・最長・合計 */}
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <StatCard
            label="現在の連続"
            value={`${current}日`}
            accent="#f97316"
            highlight
          />
          <StatCard label="最長の連続" value={`${longest}日`} accent="#4f46e5" />
          <StatCard label="記録の合計" value={`${total}件`} accent="#0ea5a4" />
        </Box>

        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 1 }}
        >
          直近{WEEKS}週間の記録。色が濃いほど、その日にたくさん記録しています。
        </Typography>

        {/* ヒートマップ（横スクロール可） */}
        <Box sx={{ overflowX: "auto", pb: 1 }}>
          <Box sx={{ display: "inline-block", minWidth: "min-content" }}>
            {/* 月ラベル */}
            <Box sx={{ display: "flex", gap: `${GAP}px`, mb: 0.5, ml: "22px" }}>
              {monthCols.map((label, i) => (
                <Box
                  key={i}
                  sx={{
                    width: CELL,
                    fontSize: 10,
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label || ""}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex" }}>
              {/* 曜日ラベル（月・水・金） */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: `${GAP}px`,
                  mr: "6px",
                }}
              >
                {["", "月", "", "水", "", "金", ""].map((w, i) => (
                  <Box
                    key={i}
                    sx={{
                      height: CELL,
                      fontSize: 9,
                      lineHeight: `${CELL}px`,
                      color: "text.secondary",
                      width: 16,
                      textAlign: "right",
                    }}
                  >
                    {w}
                  </Box>
                ))}
              </Box>
              {/* 週ごとの列 */}
              <Box sx={{ display: "flex", gap: `${GAP}px` }}>
                {weeks.map((week, wi) => (
                  <Box
                    key={wi}
                    sx={{ display: "flex", flexDirection: "column", gap: `${GAP}px` }}
                  >
                    {week.map((day) => (
                      <Tooltip
                        key={day.key}
                        title={`${day.key}：${day.count}件`}
                        arrow
                      >
                        <Box
                          sx={{
                            width: CELL,
                            height: CELL,
                            borderRadius: "3px",
                            bgcolor: cellColor(day.count),
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 凡例 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mt: 1.5,
            justifyContent: "flex-end",
          }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            少
          </Typography>
          {[0, 1, 2, 3, 4].map((c) => (
            <Box
              key={c}
              sx={{
                width: CELL,
                height: CELL,
                borderRadius: "3px",
                bgcolor: cellColor(c),
              }}
            />
          ))}
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            多
          </Typography>
        </Box>

        {total === 0 && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mt: 2, textAlign: "center" }}
          >
            まだ記録がありません。学んだことを記録すると、ここに「草」が生えていきます🌱
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// サマリーの1枚
const StatCard: React.FC<{
  label: string;
  value: string;
  accent: string;
  highlight?: boolean;
}> = ({ label, value, accent, highlight }) => (
  <Box
    sx={{
      flex: "1 1 90px",
      minWidth: 90,
      p: 1.5,
      borderRadius: 2,
      border: 1,
      borderColor: highlight ? accent : "divider",
      textAlign: "center",
      bgcolor: highlight ? `${accent}14` : "transparent",
    }}
  >
    <Typography variant="h5" sx={{ fontWeight: 800, color: accent, lineHeight: 1.2 }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
  </Box>
);

export default StreakDialog;
