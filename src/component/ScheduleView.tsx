import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import type { Plan, Note } from "./PlanTypes";
import { PLAN_STATUS_LABEL } from "./PlanTypes";
import { getRoutineOccurrencesInRange } from "./routine";

interface ScheduleViewProps {
  plans: Plan[];
  notes: Note[];
  userId: number | null;
  onOpenPlan: (planId: number) => void;
  onCreatePlanOnDate: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const isDone = (plan: Plan) => plan.status === "done" || plan.status === "suspended" || plan.progress === 100;

const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const startOfWeek = (d: Date): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
};

type DayEntry = { plan: Plan; kind: "start" | "due" };

// プランの開始日・期限日・習慣の期日を、下部ナビの「スケジュール」タブとして
// カレンダーで俯瞰できるようにする。
//
// フォルダ一覧やダイアログの奥に隠さず、タップ無しでも「その日に何があるか」が
// 見えるようにするのが目的（Googleカレンダーのように、日付セルへ直接タイトルを
// 並べる）。習慣（review_interval_days）は固定の日付列ではなく「最後にやった日＋
// N日ごと」の周期なので、表示中の範囲だけgetRoutineOccurrencesInRangeで都度
// 投影して重ねる
export default function ScheduleView({ plans, notes, userId, onOpenPlan, onCreatePlanOnDate }: ScheduleViewProps) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());

  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const rootGoalOf = (plan: Plan): Plan => {
    let cur = plan;
    while (cur.parent_id !== null) {
      const parent = planById.get(cur.parent_id);
      if (!parent) break;
      cur = parent;
    }
    return cur;
  };

  // 表示中の範囲（月表示なら月の前後の見えている週もカバー、週表示ならその週）
  const range = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(cursor);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const end = new Date(startOfWeek(last));
    end.setDate(end.getDate() + 6);
    return { start, end };
  }, [mode, cursor]);

  const { startByDate, dueByDate, habitByDate } = useMemo(() => {
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
    const habit = new Map<string, Note[]>();
    const rangeStartKey = toDateKey(range.start);
    const rangeEndKey = toDateKey(range.end);
    for (const note of notes) {
      if (!note.review_interval_days) continue;
      const occurrences = getRoutineOccurrencesInRange(
        userId,
        note.id,
        note.review_interval_days,
        rangeStartKey,
        rangeEndKey
      );
      for (const key of occurrences) {
        const list = habit.get(key) ?? [];
        list.push(note);
        habit.set(key, list);
      }
    }
    return { startByDate: start, dueByDate: due, habitByDate: habit };
  }, [plans, notes, userId, range]);

  const cells = useMemo(() => {
    const days: Date[] = [];
    const cur = new Date(range.start);
    while (cur <= range.end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [range]);

  const goPrev = () => {
    const next = new Date(cursor);
    if (mode === "week") next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setCursor(next);
  };
  const goNext = () => {
    const next = new Date(cursor);
    if (mode === "week") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCursor(next);
  };
  const goToday = () => {
    setCursor(new Date());
    setSelectedKey(todayKey);
  };

  const entriesFor = (key: string): DayEntry[] => [
    ...(startByDate.get(key) ?? []).map((plan): DayEntry => ({ plan, kind: "start" })),
    ...(dueByDate.get(key) ?? []).map((plan): DayEntry => ({ plan, kind: "due" })),
  ];

  // 親プランを表示するときは、同じ日に紐づく子プランをその中にまとめる。
  // 対象の親が今日の一覧に無くても「（親: ○○）」だけは分かるようにする
  const groupByGoal = (entries: DayEntry[]) => {
    const groups = new Map<number, { goal: Plan; entries: DayEntry[] }>();
    for (const entry of entries) {
      const goal = rootGoalOf(entry.plan);
      const group = groups.get(goal.id) ?? { goal, entries: [] };
      group.entries.push(entry);
      groups.set(goal.id, group);
    }
    return Array.from(groups.values());
  };

  const monthLabel =
    mode === "week"
      ? `${range.start.getFullYear()}年${range.start.getMonth() + 1}月${range.start.getDate()}日〜${range.end.getMonth() + 1}月${range.end.getDate()}日`
      : `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;

  const renderDayLabel = (entry: DayEntry) => (entry.kind === "start" ? "開始" : "期限");

  const dayCard = (day: Date) => {
    const key = toDateKey(day);
    const entries = entriesFor(key);
    const habitNotes = habitByDate.get(key) ?? [];
    const isToday = key === todayKey;
    const isSelected = key === selectedKey;
    const isCurrentMonth = mode === "week" || day.getMonth() === cursor.getMonth();
    const totalCount = entries.length + habitNotes.length;
    const previewLimit = mode === "week" ? 6 : 2;

    return (
      // 内側の「+」がIconButton（<button>）のため、外枠は<button>にできない
      // （<button>のネストはHTML的に無効でハイドレーションエラーになる）。
      // role="button"+tabIndex+keydownで、見た目・操作感はButtonBase相当に保つ
      <Box
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedKey((prev) => (prev === key ? null : key))}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedKey((prev) => (prev === key ? null : key));
          }
        }}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "flex-start",
          textAlign: "left",
          p: 0.5,
          minHeight: mode === "week" ? 220 : 84,
          borderRadius: 1.5,
          border: 1,
          borderColor: isSelected ? "primary.main" : "divider",
          bgcolor: isSelected ? "action.selected" : "background.paper",
          opacity: isCurrentMonth ? 1 : 0.45,
          cursor: "pointer",
          "&:focus-visible": { outline: (t) => `2px solid ${t.palette.primary.main}`, outlineOffset: 1 },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.25 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: isToday ? 800 : 400, color: isToday ? "primary.main" : "text.primary" }}
          >
            {mode === "week" ? `${WEEKDAY_LABELS[day.getDay()]} ${day.getDate()}` : day.getDate()}
          </Typography>
          <IconButton
            size="small"
            sx={{ p: 0.25 }}
            aria-label="この日にプランを作成"
            onClick={(e) => {
              e.stopPropagation();
              onCreatePlanOnDate(key);
            }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
        <Stack spacing={0.25} sx={{ mt: 0.25, overflow: "hidden" }}>
          {entries.slice(0, previewLimit).map((entry) => (
            <Box
              key={`${entry.kind}-${entry.plan.id}`}
              sx={{
                fontSize: "0.68rem",
                lineHeight: 1.3,
                px: 0.5,
                py: 0.1,
                borderRadius: 0.5,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: entry.kind === "due" ? "error.dark" : "info.dark",
                bgcolor: entry.kind === "due" ? "error.50" : "info.50",
                textDecoration: isDone(entry.plan) ? "line-through" : "none",
              }}
            >
              {entry.plan.title}
            </Box>
          ))}
          {habitNotes.slice(0, Math.max(0, previewLimit - entries.length)).map((note) => (
            <Box
              key={`habit-${note.id}`}
              sx={{
                fontSize: "0.68rem",
                lineHeight: 1.3,
                px: 0.5,
                py: 0.1,
                borderRadius: 0.5,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "warning.dark",
                bgcolor: "warning.50",
              }}
            >
              🔁 {note.title}
            </Box>
          ))}
          {totalCount > previewLimit && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, fontSize: "0.65rem" }}>
              ほか{totalCount - previewLimit}件
            </Typography>
          )}
        </Stack>
      </Box>
    );
  };

  const selectedEntries = selectedKey ? entriesFor(selectedKey) : [];
  const selectedHabits = selectedKey ? (habitByDate.get(selectedKey) ?? []) : [];
  const selectedGroups = groupByGoal(selectedEntries);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton onClick={goPrev} aria-label="前へ">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 140, textAlign: "center" }}>
            {monthLabel}
          </Typography>
          <IconButton onClick={goNext} aria-label="次へ">
            <ChevronRightIcon />
          </IconButton>
          <Button size="small" onClick={goToday}>
            今日
          </Button>
        </Stack>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="month">月</ToggleButton>
          <ToggleButton value="week">週</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.5}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "info.main" }} />
          <Typography variant="caption" color="text.secondary">開始日</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "error.main" }} />
          <Typography variant="caption" color="text.secondary">期限日</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "warning.main" }} />
          <Typography variant="caption" color="text.secondary">習慣（予測）</Typography>
        </Stack>
      </Stack>

      {mode === "week" ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
          {cells.map((day) => dayCard(day))}
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
          {WEEKDAY_LABELS.map((label) => (
            <Typography key={label} variant="caption" color="text.secondary" align="center">
              {label}
            </Typography>
          ))}
          {cells.map((day) => dayCard(day))}
        </Box>
      )}

      {selectedKey && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {Number(selectedKey.split("-")[1])}月{Number(selectedKey.split("-")[2])}日
          </Typography>
          {selectedEntries.length === 0 && selectedHabits.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              この日の予定はありません。右上の＋から新しいプランを作れます。
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {selectedGroups.map(({ goal, entries }) => {
                // 親（目標）自身がその日の一覧に含まれているかどうかで、見出しの出し方を変える
                const goalEntry = entries.find((e) => e.plan.id === goal.id);
                const childEntries = entries.filter((e) => e.plan.id !== goal.id);
                return (
                  <Box key={goal.id}>
                    <ButtonBase
                      onClick={() => onOpenPlan(goal.id)}
                      sx={{ display: "flex", alignItems: "center", gap: 0.75, width: "100%", textAlign: "left", py: 0.5 }}
                    >
                      <FlagOutlinedIcon fontSize="small" color="primary" />
                      <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                        {goal.title}
                      </Typography>
                      {goalEntry && (
                        <Typography variant="caption" color="text.secondary">
                          {renderDayLabel(goalEntry)}
                        </Typography>
                      )}
                    </ButtonBase>
                    {childEntries.length > 0 && (
                      <Stack spacing={0.5} sx={{ pl: 3, borderLeft: "2px solid", borderColor: "action.selected", ml: 1.5 }}>
                        {childEntries.map((entry) => (
                          <ButtonBase
                            key={`${entry.kind}-${entry.plan.id}`}
                            onClick={() => onOpenPlan(entry.plan.id)}
                            sx={{ display: "flex", alignItems: "center", gap: 0.75, width: "100%", textAlign: "left", py: 0.4 }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ flex: 1, minWidth: 0, wordBreak: "break-word", opacity: isDone(entry.plan) ? 0.6 : 1 }}
                            >
                              {entry.plan.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {renderDayLabel(entry)}・{PLAN_STATUS_LABEL[entry.plan.status]}
                            </Typography>
                          </ButtonBase>
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}

              {selectedHabits.length > 0 && (
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                    <RepeatIcon fontSize="small" color="warning" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      習慣（予測）
                    </Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    {selectedHabits.map((note) => (
                      <Typography key={note.id} variant="body2" color="text.secondary" sx={{ pl: 3.5 }}>
                        {note.title}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
          <Button
            size="small"
            startIcon={<AddIcon />}
            sx={{ mt: 1.5 }}
            onClick={() => onCreatePlanOnDate(selectedKey)}
          >
            この日にプランを作成
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
