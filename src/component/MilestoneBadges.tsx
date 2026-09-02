import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";

// 「積み上げ」を実感できるよう、既に持っている記録（連続日数・記録件数）だけから
// 達成バッジを組み立てる。新しくデータを保存する必要がないため、
// 端末やログイン状態によって見え方が変わることもない
type Milestone = {
  label: string;
  mark: string;
  // このバッジを獲得する条件の値
  threshold: number;
  kind: "streak" | "total";
};

// ラベルは狭いタイルの中で1行に収まる長さにしてある
// （折り返すと「1週間つづけ／た」のように語の途中で切れて読みにくい）
const MILESTONES: Milestone[] = [
  { label: "3日連続", mark: "🔥", threshold: 3, kind: "streak" },
  { label: "1週間連続", mark: "🔥", threshold: 7, kind: "streak" },
  { label: "1か月連続", mark: "🏅", threshold: 30, kind: "streak" },
  { label: "100日連続", mark: "👑", threshold: 100, kind: "streak" },
  { label: "記録1件", mark: "🌱", threshold: 1, kind: "total" },
  { label: "記録10件", mark: "📗", threshold: 10, kind: "total" },
  { label: "記録50件", mark: "📚", threshold: 50, kind: "total" },
  { label: "記録100件", mark: "🗂️", threshold: 100, kind: "total" },
];

interface MilestoneBadgesProps {
  // 最長の連続日数（一度でも達成していれば、その後途切れてもバッジは残す）
  longest: number;
  total: number;
}

export default function MilestoneBadges({ longest, total }: MilestoneBadgesProps) {
  const valueOf = (kind: Milestone["kind"]) => (kind === "streak" ? longest : total);
  const earned = MILESTONES.filter((m) => valueOf(m.kind) >= m.threshold);
  // 次に手が届くバッジ。残りが少ないものから1つだけ出して、目標を絞る
  const next = MILESTONES.filter((m) => valueOf(m.kind) < m.threshold).sort(
    (a, b) => a.threshold - valueOf(a.kind) - (b.threshold - valueOf(b.kind))
  )[0];

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        達成バッジ（{earned.length}/{MILESTONES.length}）
      </Typography>

      <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mb: next ? 2 : 0 }}>
        {MILESTONES.map((m) => {
          const done = valueOf(m.kind) >= m.threshold;
          return (
            <Tooltip
              key={m.label}
              title={
                done
                  ? `${m.label}（達成ずみ）`
                  : m.kind === "streak"
                    ? `${m.threshold}日つづけると達成`
                    : `記録が${m.threshold}件になると達成`
              }
              arrow
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 76,
                  py: 1,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: done ? "warning.main" : "divider",
                  bgcolor: done ? "warning.50" : "action.hover",
                  // 未達成のバッジは、何が待っているかは見せつつ主張は抑える
                  opacity: done ? 1 : 0.55,
                  filter: done ? "none" : "grayscale(1)",
                }}
              >
                <Box sx={{ fontSize: 20, lineHeight: 1.2 }}>{m.mark}</Box>
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.62rem", textAlign: "center", lineHeight: 1.3, mt: 0.25, whiteSpace: "nowrap" }}
                >
                  {m.label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      {next && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              次のバッジ「{next.label}」まで
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              あと{next.threshold - valueOf(next.kind)}
              {next.kind === "streak" ? "日" : "件"}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.round((valueOf(next.kind) / next.threshold) * 100))}
            color="warning"
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}
    </Box>
  );
}
