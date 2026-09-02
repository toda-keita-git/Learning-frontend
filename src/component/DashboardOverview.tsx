import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import type { Note, Plan } from "./PlanTypes";
import { isRoutineDue } from "./routine";

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
    const recentNotes = [...notes]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    return { goals: goals.length, averageProgress, dueCount, recentNotes };
  }, [plans, notes, userId]);

  const metrics = [
    { label: "今日やること", value: `${stats.dueCount}件`, icon: <TodayOutlinedIcon color="primary" /> },
    { label: "目標の平均達成率", value: stats.averageProgress === null ? "未設定" : `${stats.averageProgress}%`, icon: <InsightsOutlinedIcon color="primary" /> },
    { label: "継続日数", value: `${currentStreak}日`, icon: <LocalFireDepartmentOutlinedIcon color="warning" /> },
    { label: "記録したメモ", value: `${notes.length}件`, icon: <DescriptionOutlinedIcon color="primary" /> },
  ];

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
              今日のダッシュボード
            </Typography>
            <Typography variant="body2" color="text.secondary">
              迷ったら、まず今日やることを確認しましょう。
            </Typography>
          </Box>
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
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: 1,
          }}
        >
          {metrics.map((metric) => (
            <Box key={metric.label} sx={{ p: 1.25, borderRadius: 2, bgcolor: "action.hover", minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {metric.icon}
                <Typography variant="caption" color="text.secondary" noWrap>
                  {metric.label}
                </Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>
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
    </Paper>
  );
}
