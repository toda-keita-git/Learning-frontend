import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import type { Plan, Note } from "./PlanTypes";
import { PLAN_STATUS_LABEL } from "./PlanTypes";
import { getRoutineOccurrencesInRange } from "./routine";
import RestDaySettingsDialog from "./RestDaySettingsDialog";
import { loadRestDayConfig, saveRestDayConfig, getRestDayInfo } from "./restDays";
import type { RestDayConfig } from "./restDays";
import { useFullScreenDialog } from "./useFullScreenDialog";

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
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
};

type DayEntry = { plan: Plan; kind: "start" | "due" };

// 3種類の予定を、色と短いラベルの両方で区別する。色だけに意味を持たせると
// 色覚特性によっては読み取れないため、詳細側では必ず文字も添える
const KIND_COLOR = {
  start: "info.main",
  due: "error.main",
  habit: "warning.main",
} as const;

// 開始日〜期限日の帯の色。目標ごとに割り当てて、同じ目標の作業を色でたどれるようにする。
// 明暗どちらのテーマでも、白抜き文字が読める濃さのものを選んでいる
const GOAL_COLORS = ["#4f46e5", "#0f766e", "#b45309", "#be185d", "#1d4ed8", "#4d7c0f"];

// 1週の行に積む帯の上限。これを超えた分は「他N件」とだけ出す
const MAX_BAR_LANES = 4;

// 休みの背景色。日曜・祝日は赤系、土曜は青系、自分で足した休みは中立色にして、
// なぜ休みなのかが色でも分かるようにする
const REST_BG = {
  sunday: { light: "rgba(239,68,68,0.07)", dark: "rgba(239,68,68,0.16)" },
  holiday: { light: "rgba(239,68,68,0.07)", dark: "rgba(239,68,68,0.16)" },
  saturday: { light: "rgba(59,130,246,0.07)", dark: "rgba(59,130,246,0.16)" },
  custom: { light: "rgba(100,116,139,0.10)", dark: "rgba(148,163,184,0.16)" },
} as const;

/**
 * プランの開始日・期限日と、習慣の次回期日をカレンダーで俯瞰するタブ。
 *
 * 画面幅の狭いスマホが主な利用環境なので、月表示では日付セルに文字を詰め込まず
 * 色付きの点で「何が入っているか」だけを示し、名前は下の詳細と週表示（アジェンダ）
 * で読ませる。7列を必ず画面幅に収めるため、セルにはminmax(0,1fr)を使い、
 * 中の要素にも最小幅を持たせない。
 */
export default function ScheduleView({ plans, notes, userId, onOpenPlan, onCreatePlanOnDate }: ScheduleViewProps) {
  const todayKey = toDateKey(new Date());
  // 狭い画面では月表示だと7列に文字が詰まって読みにくいため、初期表示だけ週にする
  // （600pxはMUIの既定breakpoint。ダイアログの全画面化と同じ基準に揃えている）
  const isNarrowScreen = useFullScreenDialog();

  const [mode, setMode] = useState<"month" | "week">(() => (isNarrowScreen ? "week" : "month"));
  const [cursor, setCursor] = useState(() => new Date());
  // 開いた時点で今日が選ばれている状態にする（まず見たいのはたいてい今日のため）
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const [restConfig, setRestConfig] = useState<RestDayConfig>(() => loadRestDayConfig());
  const [restSettingsOpen, setRestSettingsOpen] = useState(false);

  // 日付をまたいだままアプリを開き続けた場合に、選択が前日のまま残らないようにする
  useEffect(() => {
    setSelectedKey((prev) => prev || todayKey);
  }, [todayKey]);

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

  // 表示中の範囲。月表示では前後の月にはみ出す週も含めて、常に7列×n段で埋める
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
    // 習慣は固定の日付を持たず「最後にやった日＋N日ごと」の周期なので、
    // 表示中の範囲だけ都度投影して重ねる
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
    const list: Date[] = [];
    const cur = new Date(range.start);
    while (cur <= range.end) {
      list.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [range]);

  // 月表示は帯を日またぎで繋ぐため、1週ごとのまとまりで描く
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cells]);

  const entriesFor = (key: string): DayEntry[] => [
    ...(startByDate.get(key) ?? []).map((plan) => ({ plan, kind: "start" as const })),
    ...(dueByDate.get(key) ?? []).map((plan) => ({ plan, kind: "due" as const })),
  ];

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

  const restInfoOf = (day: Date, key: string) => getRestDayInfo(day, key, restConfig);

  const periodLabel = useMemo(() => {
    if (mode === "week") {
      const end = new Date(range.start);
      end.setDate(end.getDate() + 6);
      const sameMonth = range.start.getMonth() === end.getMonth();
      return sameMonth
        ? `${range.start.getFullYear()}年${range.start.getMonth() + 1}月${range.start.getDate()}日〜${end.getDate()}日`
        : `${range.start.getMonth() + 1}/${range.start.getDate()}〜${end.getMonth() + 1}/${end.getDate()}`;
    }
    return `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;
  }, [mode, cursor, range]);

  // 日付セルの背景色。選択中 > 休み > 通常、の優先度で決める
  const cellBg = (key: string, tone: ReturnType<typeof restInfoOf>["tone"]) => {
    if (key === selectedKey) return "action.selected";
    if (!tone) return "background.paper";
    return (t: { palette: { mode: string } }) =>
      t.palette.mode === "dark" ? REST_BG[tone].dark : REST_BG[tone].light;
  };

  const dayNumberColor = (day: Date, tone: ReturnType<typeof restInfoOf>["tone"]) => {
    if (tone === "sunday" || tone === "holiday") return "error.main";
    if (tone === "saturday") return "info.main";
    return day.getDay() === 0 ? "error.main" : day.getDay() === 6 ? "info.main" : "text.primary";
  };

  // 開始日と期限日の両方があるプランは、点を1つずつ置くのではなく
  // 開始から期限までを1本の帯にする（いつからいつまでの作業なのかは、
  // 別々の点として置かれても読み取れないため）
  const periodPlans = useMemo(
    () => plans.filter((p) => p.start_date && p.due_date && p.start_date <= p.due_date),
    [plans]
  );

  // 同じ目標に属する帯は同じ色にして、どの目標の作業なのかを色でたどれるようにする
  const goalColorIndex = useMemo(() => {
    const roots = plans
      .filter((p) => p.parent_id === null)
      .sort((a, b) => a.id - b.id)
      .map((p) => p.id);
    const byGoal = new Map(roots.map((id, i) => [id, i % GOAL_COLORS.length]));
    const byPlan = new Map<number, number>();
    for (const plan of plans) byPlan.set(plan.id, byGoal.get(rootGoalOf(plan).id) ?? 0);
    return byPlan;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  const barColorOf = (plan: Plan) => GOAL_COLORS[goalColorIndex.get(plan.id) ?? 0];

  // その週に重なる帯を、行（レーン）に詰めて返す。同じレーンに置けるのは
  // 日付が重ならないものだけなので、左から順に空いているレーンへ入れていく
  const segmentsForWeek = (week: Date[]) => {
    const keys = week.map(toDateKey);
    const first = keys[0];
    const last = keys[keys.length - 1];
    const segments = periodPlans
      .filter((plan) => !(plan.due_date! < first || plan.start_date! > last))
      .map((plan) => {
        let colStart = 0;
        while (colStart < keys.length && keys[colStart] < plan.start_date!) colStart += 1;
        let colEnd = keys.length - 1;
        while (colEnd >= 0 && keys[colEnd] > plan.due_date!) colEnd -= 1;
        return {
          plan,
          colStart,
          colEnd,
          isStart: plan.start_date! >= first,
          isEnd: plan.due_date! <= last,
          isRoot: plan.parent_id === null,
        };
      })
      .filter((seg) => seg.colStart <= seg.colEnd)
      // 目標ごとにまとめ、目標→子プランの順に並べる
      .sort((a, b) => {
        const ga = goalColorIndex.get(a.plan.id) ?? 0;
        const gb = goalColorIndex.get(b.plan.id) ?? 0;
        if (ga !== gb) return ga - gb;
        if (a.isRoot !== b.isRoot) return a.isRoot ? -1 : 1;
        return a.colStart - b.colStart;
      });

    const laneEnds: number[] = [];
    const placed = segments.map((seg) => {
      let lane = laneEnds.findIndex((end) => end < seg.colStart);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = seg.colEnd;
      return { ...seg, lane };
    });
    const visible = placed.filter((seg) => seg.lane < MAX_BAR_LANES);
    return { segments: visible, hiddenCount: placed.length - visible.length, laneCount: Math.min(laneEnds.length, MAX_BAR_LANES) };
  };

  // 帯になったプランは点を出さない（同じものが二重に出るため）
  const periodPlanIds = useMemo(() => new Set(periodPlans.map((p) => p.id)), [periodPlans]);

  const ongoingOn = (key: string): Plan[] =>
    periodPlans.filter((p) => p.start_date! <= key && key <= p.due_date! && p.start_date! !== key && p.due_date! !== key);

  // 一覧の行頭に置く印。期間を持つプランは月表示の帯と同じ目標色にして、
  // 青・赤の点は「片方しか日付がないもの」の意味に残す
  const markOf = (plan: Plan, kind: DayEntry["kind"]) =>
    periodPlanIds.has(plan.id) ? (
      <Box
        sx={{
          width: 14,
          height: plan.parent_id === null ? 7 : 5,
          borderRadius: 999,
          bgcolor: barColorOf(plan),
          opacity: plan.parent_id === null ? 1 : 0.68,
          flexShrink: 0,
        }}
      />
    ) : (
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: KIND_COLOR[kind], flexShrink: 0 }} />
    );

  // 月表示は1週ごとに1つのグリッドにする。開始日〜期限日の帯は日をまたぐため、
  // セルを個別に描くと帯を繋げられない。1行目に日付、2行目に点、3行目以降に帯を置き、
  // 帯はgridColumnで開始列から終了列まで伸ばす
  const renderMonthWeek = (week: Date[], weekIndex: number) => {
    const { segments, hiddenCount, laneCount } = segmentsForWeek(week);

    return (
      <Box
        key={weekIndex}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          // 日付と点の行は高さを明示する。背景セルが全行にまたがるため、
          // autoのままだとこの2行が潰れ、帯が日付の上に重なってしまう
          // 帯のレーンは、帯の高さ(16px)＋上下の余白が収まるだけ確保する。
          // ここが帯より低いと、帯が次のレーンや日付の行に重なって潰れる
          gridTemplateRows: `21px 9px repeat(${Math.max(laneCount, 1)}, 19px)${hiddenCount > 0 ? " 12px" : ""}`,
          columnGap: 0.25,
          rowGap: 0.25,
          mb: 0.25,
        }}
      >
        {/* 背景。日付・点・帯のすべての行にまたがせて、休みの色をセル全体に効かせる */}
        {week.map((day, i) => {
          const key = toDateKey(day);
          const rest = restInfoOf(day, key);
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const marks = [
            ...entriesFor(key).filter((e) => !periodPlanIds.has(e.plan.id)).map((e) => e.kind),
            ...(habitByDate.get(key) ?? []).map(() => "habit" as const),
          ];
          return (
            <Box
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${day.getMonth() + 1}月${day.getDate()}日${rest.holidayName ? ` ${rest.holidayName}` : ""}`}
              onClick={() => setSelectedKey(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedKey(key);
                }
              }}
              sx={{
                gridColumn: i + 1,
                gridRow: "1 / -1",
                minWidth: 0,
                borderRadius: 1,
                cursor: "pointer",
                border: key === selectedKey ? "2px solid" : "1px solid",
                borderColor: key === selectedKey ? "primary.main" : "divider",
                bgcolor: cellBg(key, rest.tone),
                opacity: isCurrentMonth ? 1 : 0.45,
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 1 },
              }}
            >
              {/* 日付と点は背景の中に置く。帯だけは日をまたぐのでグリッド側に置く */}
              <Stack alignItems="center" sx={{ pt: 0.25, pointerEvents: "none" }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.72rem",
                    lineHeight: 1.2,
                    fontWeight: key === todayKey ? 800 : 500,
                    color: key === todayKey ? "primary.main" : dayNumberColor(day, rest.tone),
                    ...(key === todayKey && {
                      width: 19,
                      height: 19,
                      borderRadius: "50%",
                      border: "1.5px solid",
                      borderColor: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }),
                  }}
                >
                  {day.getDate()}
                </Typography>
                <Stack direction="row" spacing={0.25} sx={{ height: 7, alignItems: "center" }}>
                  {marks.slice(0, 3).map((kind, mi) => (
                    <Box key={mi} sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: KIND_COLOR[kind] }} />
                  ))}
                  {marks.length > 3 && (
                    <Typography sx={{ fontSize: "0.5rem", color: "text.secondary", lineHeight: 1 }}>
                      +{marks.length - 3}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Box>
          );
        })}

        {/* 開始日〜期限日の帯。両端が丸いのが実際の開始日・期限日で、
            角ばっている側は前後の週へ続いていることを示す */}
        {segments.map((seg) => {
          const color = barColorOf(seg.plan);
          const span = seg.colEnd - seg.colStart + 1;
          return (
            <Box
              key={`${seg.plan.id}-${seg.colStart}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenPlan(seg.plan.id);
              }}
              title={`${seg.plan.title}（${seg.plan.start_date} 〜 ${seg.plan.due_date}）`}
              sx={{
                gridColumn: `${seg.colStart + 1} / ${seg.colEnd + 2}`,
                gridRow: seg.lane + 3,
                mx: 0.25,
                zIndex: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                // 帯に載せるタイトルが読める高さを確保する。以前は10px/8pxで、
                // そこに収めるため文字が8〜9pxまで小さくなり、実質判読できなかった
                height: seg.isRoot ? 16 : 14,
                alignSelf: "center",
                bgcolor: color,
                // 子プランは以前 opacity 0.68 で薄くしていたが、透過は文字にも掛かるため
                // 白文字のコントラストが落ちる（ダークで約4:1）。塗りは不透明のままにして、
                // 太さと文字の太さだけで目標の帯と区別する。完了済みだけは薄くしてよい
                // （取り消し線も付くので、読めなくても意味が伝わる）
                opacity: isDone(seg.plan) ? 0.4 : 1,
                borderTopLeftRadius: seg.isStart ? 999 : 2,
                borderBottomLeftRadius: seg.isStart ? 999 : 2,
                borderTopRightRadius: seg.isEnd ? 999 : 2,
                borderBottomRightRadius: seg.isEnd ? 999 : 2,
              }}
            >
              {span >= 2 && (
                <Typography
                  noWrap
                  sx={{
                    // 帯の高さに収まる大きさにする（はみ出すと上下が切れて読めない）。
                    // 日本語は10px未満になると字形が潰れて読めないため、帯側の高さを
                    // 上げたうえで11px相当を下限にしている
                    fontSize: seg.isRoot ? "0.75rem" : "0.6875rem",
                    lineHeight: 1,
                    color: "#fff",
                    px: 0.5,
                    minWidth: 0,
                    fontWeight: seg.isRoot ? 700 : 500,
                    textDecoration: isDone(seg.plan) ? "line-through" : "none",
                  }}
                >
                  {seg.plan.title}
                </Typography>
              )}
            </Box>
          );
        })}

        {hiddenCount > 0 && (
          <Typography
            sx={{ gridColumn: "1 / -1", gridRow: laneCount + 3, fontSize: "0.55rem", color: "text.secondary", textAlign: "right", pr: 0.5, zIndex: 1, pointerEvents: "none" }}
          >
            他{hiddenCount}件
          </Typography>
        )}
      </Box>
    );
  };

  // 週表示は7列に切らず、縦並びのアジェンダにする。狭い画面でも名前が読め、
  // 列が潰れてレイアウトが崩れることもない
  const renderWeekRow = (day: Date) => {
    const key = toDateKey(day);
    const entries = entriesFor(key);
    const habits = habitByDate.get(key) ?? [];
    const ongoing = ongoingOn(key);
    const rest = restInfoOf(day, key);
    const isToday = key === todayKey;

    return (
      <Box
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedKey(key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedKey(key);
          }
        }}
        sx={{
          display: "grid",
          gridTemplateColumns: "44px minmax(0, 1fr)",
          gap: 1,
          alignItems: "start",
          p: 1,
          borderRadius: 1.5,
          cursor: "pointer",
          border: key === selectedKey ? "2px solid" : "1px solid",
          borderColor: key === selectedKey ? "primary.main" : "divider",
          bgcolor: cellBg(key, rest.tone),
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 1 },
        }}
      >
        <Stack alignItems="center" sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontSize: "0.65rem", color: dayNumberColor(day, rest.tone) }}>
            {WEEKDAY_LABELS[day.getDay()]}
          </Typography>
          <Typography
            sx={{
              fontSize: "1.05rem",
              fontWeight: isToday ? 800 : 600,
              lineHeight: 1.2,
              color: isToday ? "primary.main" : dayNumberColor(day, rest.tone),
            }}
          >
            {day.getDate()}
          </Typography>
        </Stack>

        <Stack spacing={0.4} sx={{ minWidth: 0, py: 0.25 }}>
          {rest.holidayName && (
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
              {rest.holidayName}
            </Typography>
          )}
          {entries.length === 0 && habits.length === 0 && ongoing.length === 0 && !rest.holidayName && (
            <Typography variant="caption" color="text.secondary">
              予定なし
            </Typography>
          )}
          {/* 月表示で帯が伸びている日は、この日が期間の途中であることを言葉でも示す */}
          {ongoing.map((plan) => (
            <Stack key={`ongoing-${plan.id}`} direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 12, height: 5, borderRadius: 999, bgcolor: barColorOf(plan), flexShrink: 0, opacity: plan.parent_id === null ? 1 : 0.68 }} />
              <Typography variant="body2" noWrap sx={{ minWidth: 0, color: "text.secondary" }}>
                {plan.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                進行中
              </Typography>
            </Stack>
          ))}
          {entries.map((entry) => (
            <Stack key={`${entry.kind}-${entry.plan.id}`} direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              {markOf(entry.plan, entry.kind)}
              <Typography
                variant="body2"
                noWrap
                sx={{ minWidth: 0, textDecoration: isDone(entry.plan) ? "line-through" : "none" }}
              >
                {entry.plan.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {entry.kind === "due" ? "期限" : "開始"}
              </Typography>
            </Stack>
          ))}
          {habits.map((note) => (
            <Stack key={`habit-${note.id}`} direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: KIND_COLOR.habit, flexShrink: 0 }} />
              <Typography variant="body2" noWrap sx={{ minWidth: 0, color: "text.secondary" }}>
                {note.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                習慣
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    );
  };

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);
  const selectedEntries = entriesFor(selectedKey);
  const selectedHabits = habitByDate.get(selectedKey) ?? [];
  const selectedOngoing = ongoingOn(selectedKey);
  const selectedRest = restInfoOf(selectedDate, selectedKey);

  // 子プランは親目標の中に入れて表示する（同じ目標の作業がばらけないように）
  const selectedGroups = useMemo(() => {
    const groups = new Map<number, { goal: Plan; entries: DayEntry[] }>();
    for (const entry of selectedEntries) {
      const goal = rootGoalOf(entry.plan);
      const group = groups.get(goal.id) ?? { goal, entries: [] };
      group.entries.push(entry);
      groups.set(goal.id, group);
    }
    return Array.from(groups.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, plans, startByDate, dueByDate]);

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        カレンダー
      </Typography>

      {/* 操作列。狭い画面でも折り返して収まるようにしている */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <IconButton size="small" onClick={goPrev} aria-label="前へ">
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontWeight: 700, flex: 1, textAlign: "center", fontSize: { xs: "0.95rem", sm: "1.1rem" } }} noWrap>
          {periodLabel}
        </Typography>
        <IconButton size="small" onClick={goNext} aria-label="次へ">
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, v) => v && setMode(v)}
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="month" sx={{ px: 1.5 }}>月</ToggleButton>
          <ToggleButton value="week" sx={{ px: 1.5 }}>週</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" onClick={goToday} sx={{ flexShrink: 0 }}>
          今日
        </Button>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={() => setRestSettingsOpen(true)} aria-label="休みの設定">
          <TuneIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* 凡例。帯（開始〜期限）と、片方しか日付がないものの点を分けて説明する */}
      <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap", rowGap: 0.5, alignItems: "center" }}>
        {mode === "month" && (
          <>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 18, height: 8, borderRadius: 999, bgcolor: GOAL_COLORS[0] }} />
              <Typography variant="caption" color="text.secondary">
                目標の期間
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {/* 実際の帯から透過をやめたので、見本も塗りは同じにして太さだけで区別する */}
              <Box sx={{ width: 18, height: 6, borderRadius: 999, bgcolor: GOAL_COLORS[0] }} />
              <Typography variant="caption" color="text.secondary">
                子プランの期間
              </Typography>
            </Stack>
          </>
        )}
        {[
          { color: KIND_COLOR.start, label: "開始日のみ" },
          { color: KIND_COLOR.due, label: "期限日のみ" },
          { color: KIND_COLOR.habit, label: "習慣" },
        ].map((item) => (
          <Stack key={item.label} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: item.color }} />
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {mode === "month" ? (
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.25, mb: 0.5 }}>
            {WEEKDAY_LABELS.map((label, i) => (
              <Typography
                key={label}
                variant="caption"
                sx={{
                  textAlign: "center",
                  fontSize: "0.68rem",
                  color: i === 0 ? "error.main" : i === 6 ? "info.main" : "text.secondary",
                }}
              >
                {label}
              </Typography>
            ))}
          </Box>
          {weeks.map((week, i) => renderMonthWeek(week, i))}
        </Box>
      ) : (
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>{cells.map((day) => renderWeekRow(day))}</Stack>
      )}

      {/* 選択中の日の詳細。初期表示では今日が選ばれている */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 0.5 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日（{WEEKDAY_LABELS[selectedDate.getDay()]}）
          </Typography>
          {selectedKey === todayKey && <Chip label="今日" size="small" color="primary" />}
          {selectedRest.holidayName && <Chip label={selectedRest.holidayName} size="small" color="error" variant="outlined" />}
          {selectedRest.isRest && !selectedRest.holidayName && <Chip label="休み" size="small" variant="outlined" />}
        </Stack>

        {selectedEntries.length === 0 && selectedHabits.length === 0 && selectedOngoing.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            この日の予定はありません。
          </Typography>
        ) : (
          <Stack spacing={1.5} sx={{ mb: 1.5 }}>
            {/* 帯が伸びているだけの日（期間の途中）も、何が動いているのか分かるようにする */}
            {selectedOngoing.length > 0 && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  進行中
                </Typography>
                <Stack spacing={0.5}>
                  {selectedOngoing.map((plan) => (
                    <Stack
                      key={plan.id}
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      onClick={() => onOpenPlan(plan.id)}
                      sx={{ cursor: "pointer", minWidth: 0 }}
                    >
                      <Box
                        sx={{
                          width: 14,
                          height: plan.parent_id === null ? 7 : 5,
                          borderRadius: 999,
                          bgcolor: barColorOf(plan),
                          opacity: plan.parent_id === null ? 1 : 0.68,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                        {plan.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {plan.start_date}〜{plan.due_date}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
            {selectedGroups.map(({ goal, entries }) => (
              <Box key={goal.id} sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  onClick={() => onOpenPlan(goal.id)}
                  sx={{ cursor: "pointer", minWidth: 0 }}
                >
                  <FlagOutlinedIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, minWidth: 0 }}>
                    {goal.title}
                  </Typography>
                </Stack>
                <Stack spacing={0.5} sx={{ mt: 0.5, pl: 1, borderLeft: "2px solid", borderColor: "action.selected" }}>
                  {entries.map((entry) => (
                    <Stack
                      key={`${entry.kind}-${entry.plan.id}`}
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      onClick={() => onOpenPlan(entry.plan.id)}
                      sx={{ cursor: "pointer", minWidth: 0 }}
                    >
                      {markOf(entry.plan, entry.kind)}
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ minWidth: 0, textDecoration: isDone(entry.plan) ? "line-through" : "none" }}
                      >
                        {entry.plan.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {entry.kind === "due" ? "期限" : "開始"}・{PLAN_STATUS_LABEL[entry.plan.status]}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}

            {selectedHabits.length > 0 && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  習慣（予測）
                </Typography>
                <Stack spacing={0.5}>
                  {selectedHabits.map((note) => (
                    <Stack key={note.id} direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: KIND_COLOR.habit, flexShrink: 0 }} />
                      <Typography variant="body2" noWrap sx={{ minWidth: 0, color: "text.secondary" }}>
                        {note.title}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}

        <Button size="small" startIcon={<AddIcon />} onClick={() => onCreatePlanOnDate(selectedKey)}>
          この日にプランを作成
        </Button>
      </Paper>

      {restSettingsOpen && (
        <RestDaySettingsDialog
          open
          config={restConfig}
          onClose={() => setRestSettingsOpen(false)}
          onSave={(next) => {
            setRestConfig(next);
            saveRestDayConfig(next);
            setRestSettingsOpen(false);
          }}
        />
      )}
    </Stack>
  );
}
