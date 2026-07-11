import { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";

interface LearningAnalyticsItem {
  understanding_level: number;
  created_at: string;
  category_name: string;
}

interface LearningAnalyticsDialogProps {
  open: boolean;
  onClose: () => void;
  items: LearningAnalyticsItem[];
}

const WEEKS_TO_SHOW = 8;

// 直近N週の月曜始まりの週ラベルと件数を集計する
const buildWeeklyBuckets = (items: LearningAnalyticsItem[]) => {
  const startOfWeek = (d: Date) => {
    const day = (d.getDay() + 6) % 7; // 月曜=0
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - day);
    return s;
  };

  const today = startOfWeek(new Date());
  const buckets: { label: string; start: Date; count: number }[] = [];
  for (let i = WEEKS_TO_SHOW - 1; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(start.getDate() - i * 7);
    buckets.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      start,
      count: 0,
    });
  }

  items.forEach((item) => {
    const d = new Date(item.created_at);
    if (Number.isNaN(d.getTime())) return;
    const wk = startOfWeek(d).getTime();
    const bucket = buckets.find((b) => b.start.getTime() === wk);
    if (bucket) bucket.count += 1;
  });

  return buckets;
};

// 数値の系列を、棒グラフとして描画する共通コンポーネント（単一系列=マグニチュード用に単色）
function BarRow({
  label,
  value,
  max,
  suffix = "件",
  labelWidth = 56,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  labelWidth?: number;
}) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <Tooltip title={`${label}: ${value}${suffix}`} placement="top">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography
          variant="caption"
          noWrap
          sx={{
            width: labelWidth,
            flexShrink: 0,
            color: "text.secondary",
            textAlign: "right",
          }}
        >
          {label}
        </Typography>
        <Box sx={{ flex: 1, bgcolor: "action.hover", borderRadius: 999, height: 12, overflow: "hidden" }}>
          <Box
            sx={{
              width: `${pct}%`,
              height: "100%",
              bgcolor: "primary.main",
              borderRadius: 999,
              transition: "width .3s ease",
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{ width: 32, flexShrink: 0, color: "text.secondary", fontWeight: 600 }}
        >
          {value}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default function LearningAnalyticsDialog({
  open,
  onClose,
  items,
}: LearningAnalyticsDialogProps) {
  const weekly = useMemo(() => buildWeeklyBuckets(items), [items]);
  const weeklyMax = Math.max(1, ...weekly.map((w) => w.count));

  const levelCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    items.forEach((item) => {
      const lv = Math.min(5, Math.max(1, item.understanding_level || 3));
      counts[lv - 1] += 1;
    });
    return counts;
  }, [items]);
  const levelMax = Math.max(1, ...levelCounts);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const name = item.category_name || "未分類";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [items]);
  const categoryMax = Math.max(1, ...categoryCounts.map(([, c]) => c));

  const totalCount = items.length;
  const thisWeekCount = weekly[weekly.length - 1]?.count ?? 0;
  const avgLevel =
    totalCount > 0
      ? (
          items.reduce((sum, i) => sum + (i.understanding_level || 0), 0) / totalCount
        ).toFixed(1)
      : "-";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InsightsOutlinedIcon color="primary" /> 学習分析ダッシュボード
      </DialogTitle>
      <DialogContent dividers>
        {totalCount === 0 ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
            まだ学習記録がありません。記録が増えると、ここに傾向が表示されます。
          </Typography>
        ) : (
          <Stack spacing={3}>
            {/* サマリー */}
            <Stack direction="row" spacing={1.5}>
              {[
                { label: "総記録数", value: `${totalCount}件` },
                { label: "今週の記録", value: `${thisWeekCount}件` },
                { label: "平均理解度", value: `${avgLevel} / 5` },
              ].map((s) => (
                <Paper
                  key={s.label}
                  variant="outlined"
                  sx={{ flex: 1, p: 1.5, textAlign: "center" }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {s.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {s.value}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            {/* 週次の学習件数 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                週次の記録件数（直近{WEEKS_TO_SHOW}週）
              </Typography>
              <Stack spacing={1}>
                {weekly.map((w) => (
                  <BarRow key={w.label} label={w.label} value={w.count} max={weeklyMax} />
                ))}
              </Stack>
            </Box>

            {/* 理解度の分布 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                理解度の分布
              </Typography>
              <Stack spacing={1}>
                {levelCounts.map((count, i) => (
                  <BarRow key={i} label={"★".repeat(i + 1)} value={count} max={levelMax} />
                ))}
              </Stack>
            </Box>

            {/* カテゴリ別（上位5件） */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                カテゴリ別の記録数（上位5件）
              </Typography>
              <Stack spacing={1}>
                {categoryCounts.map(([name, count]) => (
                  <BarRow
                    key={name}
                    label={name}
                    value={count}
                    max={categoryMax}
                    labelWidth={90}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
