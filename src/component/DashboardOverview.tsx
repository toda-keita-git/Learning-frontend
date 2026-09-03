import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import type { Note, Plan } from "./PlanTypes";
import { isRoutineDue } from "./routine";
import { daysUntil } from "./deadline";

interface DashboardOverviewProps {
  plans: Plan[];
  notes: Note[];
  userId: number | null;
  currentStreak: number;
  onOpenToday: () => void;
  onOpenSummary: () => void;
  onOpenNote: (note: Note) => void;
}

export default function DashboardOverview({
  plans,
  notes,
  userId,
  currentStreak,
  onOpenToday,
  onOpenSummary,
  onOpenNote,
}: DashboardOverviewProps) {
  const stats = useMemo(() => {
    const goals = plans.filter((plan) => plan.parent_id === null);
    const progressValues = goals
      .map((goal) => goal.progress)
      .filter((value): value is number => value !== null);
    const averageProgress = progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : null;
    const dueCount = notes.filter((note) =>
      isRoutineDue(userId, note.id, note.review_interval_days)
    ).length;
    const activePlans = plans.filter(
      (plan) => plan.status !== "done" && plan.status !== "suspended" && plan.progress !== 100
    );
    const overdueCount = activePlans.filter(
      (plan) => plan.due_date && daysUntil(plan.due_date) < 0
    ).length;
    const upcomingDeadlineCount = activePlans.filter((plan) => {
      if (!plan.due_date) return false;
      const days = daysUntil(plan.due_date);
      return days >= 0 && days <= 7;
    }).length;
    const recentNotes = [...notes]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    return { goals: goals.length, averageProgress, dueCount, overdueCount, upcomingDeadlineCount, recentNotes };
  }, [plans, notes, userId]);

  // ベントーグリッド。4つを同じ大きさで並べると「どれから見ればいいか」が
  // 伝わらないため、まず見るべき「今日やること」だけタイルを大きくして、
  // 大きさそのものに優先度の意味を持たせる。
  // spanは各段がちょうど埋まる値にしてある（狭い画面=2列: 2 / 1+1 / 2、
  // 広い画面=6列: 3+1+1+1）。余ったセルができると、抜けのある表に見えてしまう
  const metrics = [
    {
      label: "今日やること",
      value: `${stats.dueCount}件`,
      icon: <TodayOutlinedIcon color="primary" />,
      primary: true,
      span: { xs: "span 2", md: "span 3" },
    },
    {
      label: "7日以内の期限",
      value: stats.overdueCount > 0 ? `${stats.overdueCount}件超過` : `${stats.upcomingDeadlineCount}件`,
      icon: <EventBusyOutlinedIcon color={stats.overdueCount > 0 ? "error" : "warning"} />,
      primary: false,
      span: { xs: "span 1", md: "span 1" },
    },
    {
      label: "目標の平均達成率",
      value: stats.averageProgress === null ? "未設定" : `${stats.averageProgress}%`,
      icon: <InsightsOutlinedIcon color="primary" />,
      primary: false,
      span: { xs: "span 1", md: "span 1" },
    },
    {
      label: "継続日数",
      value: `${currentStreak}日`,
      icon: <LocalFireDepartmentOutlinedIcon color="warning" />,
      primary: false,
      span: { xs: "span 2", md: "span 1" },
    },
  ];

  // 見出しと外枠は、置き場所であるDashboardDialog側が持つ（重複させない）
  return (
    <Box>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
          <Typography variant="body2" color="text.secondary">
            迷ったら、まず今日やることを確認しましょう。
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" startIcon={<TodayOutlinedIcon />} onClick={onOpenToday}>
              今日やること
            </Button>
            <Button size="small" variant="outlined" startIcon={<InsightsOutlinedIcon />} onClick={onOpenSummary}>
              振り返り
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(6, minmax(0, 1fr))" },
            gap: 1,
          }}
        >
          {metrics.map((metric) => (
            <Box
              key={metric.label}
              sx={{
                p: metric.primary ? 1.75 : 1.25,
                borderRadius: 2,
                minWidth: 0,
                gridColumn: metric.span,
                bgcolor: metric.primary ? "primary.main" : "action.hover",
                color: metric.primary ? "primary.contrastText" : "inherit",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ display: "flex", "& .MuiSvgIcon-root": metric.primary ? { color: "inherit" } : undefined }}>
                  {metric.icon}
                </Box>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: metric.primary ? "inherit" : "text.secondary", opacity: metric.primary ? 0.9 : 1 }}
                >
                  {metric.label}
                </Typography>
              </Stack>
              <Typography variant={metric.primary ? "h5" : "h6"} sx={{ mt: 0.5, fontWeight: 800 }}>
                {metric.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {stats.recentNotes.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 700 }}>
              最近のメモ
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75}>
              {stats.recentNotes.map((note) => (
                <Chip
                  key={note.id}
                  label={note.title}
                  variant="outlined"
                  onClick={() => onOpenNote(note)}
                  sx={{ maxWidth: { xs: "100%", sm: 220 }, justifyContent: "flex-start" }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
