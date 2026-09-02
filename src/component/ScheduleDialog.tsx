import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import ButtonBase from "@mui/material/ButtonBase";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import type { Plan } from "./PlanTypes";
import { PLAN_STATUS_LABEL } from "./PlanTypes";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  plans: Plan[];
  onOpenPlan: (planId: number) => void;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// deadline.tsのlocalDateと同じ考え方（タイムゾーンのズレでYYYY-MM-DDが1日ずれるのを防ぐ）
const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const isDone = (plan: Plan) => plan.status === "done" || plan.status === "suspended" || plan.progress === 100;

// プランの開始日・期限日をカレンダーで見渡せる画面。
// 「その他」メニューから開く。プランボードは階層構造を見るためのもので、
// 「いつ何をやるか」を月単位で俯瞰する用途には向かないため別画面にしている
export default function ScheduleDialog({ open, onClose, plans, onOpenPlan }: ScheduleDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 日付キー(YYYY-MM-DD) → その日が開始日・期限日のプラン一覧
  const { startByDate, dueByDate } = useMemo(() => {
    const start = new Map<string, Plan[]>();
    const due = new Map<string, Plan[]>();
    for (const plan of plans) {
      if (plan.start_date) {
        const list = start.get(plan.start_date) ?? [];
        list.push(plan);
        start.set(plan.start_date, list);
      }
      if (plan.due_date) {
        const list = due.get(plan.due_date) ?? [];
        list.push(plan);
        due.set(plan.due_date, list);
      }
    }
    return { startByDate: start, dueByDate: due };
  }, [plans]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const todayKey = toDateKey(new Date());

  const cells: (string | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(year, month, i + 1))),
  ];

  const goToMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedKey(null);
  };
  const goToToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedKey(todayKey);
  };

  const selectedStart = selectedKey ? (startByDate.get(selectedKey) ?? []) : [];
  const selectedDue = selectedKey ? (dueByDate.get(selectedKey) ?? []) : [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CalendarMonthOutlinedIcon color="primary" />
        スケジュール
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <IconButton onClick={() => goToMonth(-1)} aria-label="前の月">
              <ChevronLeftIcon />
            </IconButton>
            <Stack alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {year}年{month + 1}月
              </Typography>
              <Button size="small" onClick={goToToday}>
                今日
              </Button>
            </Stack>
            <IconButton onClick={() => goToMonth(1)} aria-label="次の月">
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ px: 0.5 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "info.main" }} />
              <Typography variant="caption" color="text.secondary">
                開始日
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main" }} />
              <Typography variant="caption" color="text.secondary">
                期限日
              </Typography>
            </Stack>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
            {WEEKDAY_LABELS.map((label) => (
              <Typography key={label} variant="caption" color="text.secondary" align="center">
                {label}
              </Typography>
            ))}
            {cells.map((key, index) => {
              if (!key) return <Box key={`blank-${index}`} />;
              const day = Number(key.split("-")[2]);
              const hasStart = startByDate.has(key);
              const hasDue = dueByDate.has(key);
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              return (
                <ButtonBase
                  key={key}
                  onClick={() => setSelectedKey((prev) => (prev === key ? null : key))}
                  sx={{
                    aspectRatio: "1",
                    borderRadius: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.25,
                    border: 1,
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "action.selected" : "background.paper",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: isToday ? 800 : 400, color: isToday ? "primary.main" : "text.primary" }}
                  >
                    {day}
                  </Typography>
                  {(hasStart || hasDue) && (
                    <Stack direction="row" spacing={0.4}>
                      {hasStart && <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "info.main" }} />}
                      {hasDue && <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "error.main" }} />}
                    </Stack>
                  )}
                </ButtonBase>
              );
            })}
          </Box>

          {selectedKey && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {Number(selectedKey.split("-")[1])}月{Number(selectedKey.split("-")[2])}日
              </Typography>
              {selectedStart.length === 0 && selectedDue.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  この日に開始日・期限日が設定されたプランはありません。
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {selectedDue.map((plan) => (
                    <ButtonBase
                      key={`due-${plan.id}`}
                      onClick={() => onOpenPlan(plan.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        width: "100%",
                        textAlign: "left",
                        borderRadius: 1,
                        px: 1,
                        py: 0.75,
                        bgcolor: "action.hover",
                        opacity: isDone(plan) ? 0.6 : 1,
                      }}
                    >
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main", flexShrink: 0 }} />
                      <FlagOutlinedIcon fontSize="small" color="action" sx={{ flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                        {plan.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        期限・{PLAN_STATUS_LABEL[plan.status]}
                      </Typography>
                    </ButtonBase>
                  ))}
                  {selectedStart.map((plan) => (
                    <ButtonBase
                      key={`start-${plan.id}`}
                      onClick={() => onOpenPlan(plan.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        width: "100%",
                        textAlign: "left",
                        borderRadius: 1,
                        px: 1,
                        py: 0.75,
                        bgcolor: "action.hover",
                        opacity: isDone(plan) ? 0.6 : 1,
                      }}
                    >
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "info.main", flexShrink: 0 }} />
                      <FlagOutlinedIcon fontSize="small" color="action" sx={{ flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                        {plan.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        開始・{PLAN_STATUS_LABEL[plan.status]}
                      </Typography>
                    </ButtonBase>
                  ))}
                </Stack>
              )}
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
