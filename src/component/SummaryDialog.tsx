import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useFullScreenDialog } from "./useFullScreenDialog";
import { useToast } from "../ToastContext";
import type { Note, Plan } from "./PlanTypes";

interface SummaryDialogProps {
  open: boolean;
  onClose: () => void;
  plans: Plan[];
  notes: Note[];
  // 継続日数（習慣リストの記録から算出済みの値をそのまま受け取る）
  currentStreak: number;
}

const startOfMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// 振り返り画面。「今月どれだけ積み上げたか」を数字で見せる。
//
// 学習記録アプリで人に見せたくなるのは「続いた日数」と「終わらせた目標」なので、
// その2つを主役にし、コピーして共有できる短いテキストも用意している。
// 画像化ではなくテキストにしているのは、SNSでもチャットでもそのまま貼れて、
// 生成のための追加ライブラリが要らないため。
export default function SummaryDialog({ open, onClose, plans, notes, currentStreak }: SummaryDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const since = startOfMonth();
    const notesThisMonth = notes.filter((n) => new Date(n.created_at) >= since);
    const doneTodos = notes.reduce(
      (sum, n) => sum + n.todo_items.filter((t) => t.checked).length,
      0
    );
    const donePlans = plans.filter((p) => p.status === "done").length;
    const inProgressPlans = plans.filter((p) => p.status === "in_progress").length;
    // ルートの目標だけの平均達成率。未算出（未設定）は母数から外す
    const goalProgresses = plans
      .filter((p) => p.parent_id === null && p.progress !== null)
      .map((p) => p.progress as number);
    const avgGoalProgress =
      goalProgresses.length > 0
        ? Math.round(goalProgresses.reduce((a, b) => a + b, 0) / goalProgresses.length)
        : null;
    const now = new Date();
    const weeklyNotes = Array.from({ length: 6 }, (_, index) => {
      const weeksAgo = 5 - index;
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() - weeksAgo * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return {
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        count: notes.filter((note) => {
          const created = new Date(note.created_at);
          return created >= start && created <= end;
        }).length,
      };
    });
    return {
      notesThisMonth: notesThisMonth.length,
      totalNotes: notes.length,
      doneTodos,
      donePlans,
      inProgressPlans,
      avgGoalProgress,
      weeklyNotes,
    };
  }, [plans, notes]);

  const shareText = useMemo(() => {
    const lines = [
      `今月は${stats.notesThisMonth}件のメモを積み上げました。`,
      `完了したプラン: ${stats.donePlans}件 / 進行中: ${stats.inProgressPlans}件`,
    ];
    if (currentStreak > 0) lines.push(`継続 ${currentStreak}日`);
    if (stats.avgGoalProgress !== null) lines.push(`目標の平均達成率: ${stats.avgGoalProgress}%`);
    lines.push("#ツミアゲ で学習を記録中");
    return lines.join("\n");
  }, [stats, currentStreak]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      showToast("コピーしました。", "success");
    } catch {
      // クリップボードが使えない環境（権限拒否・http接続など）では、
      // 下のテキスト欄から手動で選択してもらう
      showToast("コピーできませんでした。下の文章を選択してコピーしてください。", "info");
    }
  };

  const Metric = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
    <Box sx={{ flex: "1 1 40%", minWidth: 120, textAlign: "center", py: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
        {value}
        {unit && (
          <Typography component="span" variant="body2" sx={{ ml: 0.25, fontWeight: 700 }}>
            {unit}
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InsightsOutlinedIcon color="primary" />
        振り返り
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "primary.main",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <Metric label="今月のメモ" value={stats.notesThisMonth} unit="件" />
            <Metric label="継続日数" value={currentStreak} unit="日" />
            <Metric label="完了したプラン" value={stats.donePlans} unit="件" />
            <Metric label="消化したtodo" value={stats.doneTodos} unit="件" />
          </Box>

          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                これまでのメモ
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {stats.totalNotes}件
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                進行中のプラン
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {stats.inProgressPlans}件
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                目標の平均達成率
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {stats.avgGoalProgress === null ? "未設定" : `${stats.avgGoalProgress}%`}
              </Typography>
            </Stack>
          </Stack>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              直近6週間のメモ
            </Typography>
            <Box sx={{ height: 128, display: "flex", alignItems: "flex-end", gap: 0.75 }}>
              {stats.weeklyNotes.map((week) => {
                const max = Math.max(1, ...stats.weeklyNotes.map((item) => item.count));
                const height = week.count === 0 ? 4 : Math.max(12, Math.round((week.count / max) * 92));
                return (
                  <Stack key={week.label} alignItems="center" justifyContent="flex-end" sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {week.count}
                    </Typography>
                    <Box
                      title={`${week.label}から7日間: ${week.count}件`}
                      sx={{ width: "100%", maxWidth: 32, height, bgcolor: "primary.main", borderRadius: "4px 4px 0 0" }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mt: 0.25 }}>
                      {week.label}
                    </Typography>
                  </Stack>
                );
              })}
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              共有用の文章
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
                fontSize: "0.8rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "inherit",
              }}
            >
              {shareText}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>とじる</Button>
        <Button onClick={handleCopy} variant="contained" startIcon={<ContentCopyIcon />}>
          {copied ? "コピー済み" : "コピー"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
