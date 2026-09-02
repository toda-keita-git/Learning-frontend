import { lazy, Suspense, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AddIcon from "@mui/icons-material/Add";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChecklistIcon from "@mui/icons-material/Checklist";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import Badge from "@mui/material/Badge";
import Checkbox from "@mui/material/Checkbox";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LoyaltyOutlinedIcon from "@mui/icons-material/LoyaltyOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";

import { useToast } from "./ToastContext";
import { isRoutineDue, markRoutineDone, clearRoutineDone, getRemainingDays } from "./component/routine";
const StreakDialog = lazy(() => import("./component/StreakDialog"));
import { calculateStreakStats } from "./component/streakStats";
const TodayNextDialog = lazy(() => import("./component/TodayNextDialog"));
const PlanBoardHelpDialog = lazy(() => import("./component/PlanBoardHelpDialog"));
const AccountInfoDialog = lazy(() => import("./component/AccountInfoDialog"));
const SettingsDialog = lazy(() => import("./component/SettingsDialog"));
const FaqDialog = lazy(() => import("./component/FaqDialog"));
const UsageGuideDialog = lazy(() => import("./component/UsageGuideDialog"));
const PricingPlanDialog = lazy(() => import("./component/PricingPlanDialog"));
import NotePreviewDialog from "./component/NotePreviewDialog";
import { savePlanCache, loadPlanCache } from "./component/offlinePlanCache";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import Alert from "@mui/material/Alert";
import type { PlanDataSource } from "./component/planDataSource";
import type { Plan, Note, NoteInput, PlanInput, CategoryOption, NoteAttachment } from "./component/PlanTypes";
import { NOTE_TYPE_LABEL } from "./component/PlanTypes";
import { errorMessage } from "./component/errorMessage";
import { PLAN_STATUS_LABEL } from "./component/PlanTypes";
import ProgressBadge from "./component/ProgressBadge";
import PlanFormDialog from "./component/PlanFormDialog";
import PlanSelectDialog from "./component/PlanSelectDialog";
import PlanTree from "./component/PlanTree";
import NoteTray from "./component/NoteTray";
import { NOTE_TRAY_EXPANDED_HEIGHT } from "./component/noteTrayLayout";
import NoteFormDialog from "./component/NoteFormDialog";
import type { PlanOption } from "./component/PlanPicker";
import NoteCard from "./component/NoteCard";
import AdBanner from "./component/AdBanner";
import ReviewDialog, { hasCloze } from "./component/ReviewDialog";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import { appendStudyLog } from "./component/studyLogCommit";
import { isStudyLogCommitEnabled } from "./component/studyLogSetting";
import { AuthContext } from "./Context";
import { maybeNotifyReview, updateAppBadge } from "./notifications";
const SummaryDialog = lazy(() => import("./component/SummaryDialog"));
const ScheduleDialog = lazy(() => import("./component/ScheduleDialog"));
import DashboardOverview from "./component/DashboardOverview";
import GoalTemplates from "./component/GoalTemplates";
import type { GoalTemplate } from "./component/GoalTemplates";
import DeadlineChip from "./component/DeadlineChip";

type BottomTab = "plans" | "library" | "review" | "more";

type DeleteTarget = { kind: "plan"; plan: Plan } | { kind: "note"; note: Note };

interface PlanDashboardProps {
  dataSource: PlanDataSource;
  userId: number | null;
  onLogout: () => void;
  topBanner?: ReactNode;
}


export default function PlanDashboard({ dataSource, userId, onLogout, topBanner }: PlanDashboardProps) {
  const { showToast } = useToast();
  // 学習ログのコミット先（GitHub連携済みのときだけ使える）
  const { octokit, githubLogin, repoName } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [bottomTab, setBottomTab] = useState<BottomTab>("plans");
  // メモトレイの開閉。展開時はプランボード側の下余白をトレイの高さぶん広げる必要があるため、親で持つ
  const [noteTrayOpen, setNoteTrayOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  // メモをドラッグして「新しいプランとして保存」した場合、作成成功後にこのメモをリンクする
  const [pendingLinkNoteId, setPendingLinkNoteId] = useState<number | null>(null);
  // ドラッグの代わりに検索して移動先を選ぶダイアログ（「⋮」メニューの「別のプランへ移動」）
  const [reparentPickerPlan, setReparentPickerPlan] = useState<Plan | null>(null);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteFixedPlanId, setNoteFixedPlanId] = useState<number | null | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  // 習慣の完了記録はlocalStorage（routine.ts）にあるためReact stateの変化を検知できない。
  // チェック/取り消しのたびにこれをインクリメントし、useMemoの依存に使って再計算させる
  const [routineVersion, setRoutineVersion] = useState(0);
  const [streakDialogOpen, setStreakDialogOpen] = useState(false);
  const [todayNextOpen, setTodayNextOpen] = useState(false);
  const [boardHelpOpen, setBoardHelpOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [usageGuideOpen, setUsageGuideOpen] = useState(false);
  const [pricingPlanOpen, setPricingPlanOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // メモトレイからプレビューを開いているメモ。編集や添付追加で内容が変わっても
  // 最新が映るよう、メモ自体ではなくIDを持ってnotesから引き直す
  const [previewNoteId, setPreviewNoteId] = useState<number | null>(null);
  // 習慣リストから復習モードで開いているメモ。編集画面と同じく、内容が変わっても
  // 最新が映るようメモ自体ではなくIDを持つ
  const [reviewNoteId, setReviewNoteId] = useState<number | null>(null);
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<"all" | Note["type"]>("all");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<"all" | number>("all");
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);

  // 統合ボード（プランツリー）の展開状態。既定はすべて展開＝ドリルダウンせずに全体が見える
  const [collapsedPlanIds, setCollapsedPlanIds] = useState<Set<number>>(new Set());
  const isExpanded = (id: number) => !collapsedPlanIds.has(id);
  const toggleExpand = (id: number) =>
    setCollapsedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // メモトレイからプラン行（またはプラン新規作成ゾーン）へのドラッグ状態。
  // 実際のPointer Events処理はNoteTray自身が持ち、ここではボード側の表示連動に必要な分だけ受け取る
  const [draggingNoteId, setDraggingNoteId] = useState<number | null>(null);
  const [noteHoverPlanId, setNoteHoverPlanId] = useState<number | null>(null);
  const [noteHoverCreateZone, setNoteHoverCreateZone] = useState(false);
  // 取得に失敗し、前回のキャッシュ表示にフォールバックした場合の状態
  const [offline, setOffline] = useState(false);
  const [offlineCacheTs, setOfflineCacheTs] = useState<number | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const bundle = await dataSource.fetchAll();
      setPlans(bundle.plans);
      setNotes(bundle.notes);
      setCategories(bundle.categories);
      setTagOptions(bundle.tagOptions);
      setOffline(false);
      savePlanCache(userId, bundle);
    } catch (err) {
      console.error(err);
      const cached = loadPlanCache(userId);
      if (cached) {
        setPlans(cached.plans);
        setNotes(cached.notes);
        setCategories(cached.categories);
        setTagOptions(cached.tagOptions);
        setOffline(true);
        setOfflineCacheTs(cached.ts);
        showToast("オフラインのため、前回取得した内容を表示しています。", "warning");
      } else {
        showToast(errorMessage(err, "データの取得に失敗しました。時間をおいて再度お試しください。"), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  const childrenOf = (parentId: number | null) =>
    plans.filter((p) => p.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);

  const breadcrumbChain = (planId: number): Plan[] => {
    const chain: Plan[] = [];
    let cursor: number | null = planId;
    while (cursor !== null) {
      const plan: Plan | undefined = planById.get(cursor);
      if (!plan) break;
      chain.unshift(plan);
      cursor = plan.parent_id;
    }
    return chain;
  };

  const planLabel = (plan: Plan): string => breadcrumbChain(plan.id).map((p) => p.title).join(" / ");

  const planOptions: PlanOption[] = useMemo(
    () => plans.map((p) => ({ id: p.id, label: planLabel(p) })).sort((a, b) => a.label.localeCompare(b.label, "ja")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans]
  );

  const descendantIds = (planId: number): number[] => {
    const result: number[] = [];
    const stack = [planId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const child of childrenOf(current)) {
        result.push(child.id);
        stack.push(child.id);
      }
    }
    return result;
  };

  // 「別のプランへ移動」ダイアログの候補。自分自身・自分の子孫は循環になるため除外する
  const reparentOptions: PlanOption[] = useMemo(() => {
    if (!reparentPickerPlan) return [];
    const excluded = new Set([reparentPickerPlan.id, ...descendantIds(reparentPickerPlan.id)]);
    return planOptions.filter((o) => !excluded.has(o.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reparentPickerPlan, planOptions, plans]);

  const selectedPlan = selectedPlanId !== null ? planById.get(selectedPlanId) ?? null : null;

  const notesLinkedTo = (planId: number) =>
    notes.filter((n) => n.links.includes(planId)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ストリークは、このプラン＋子孫プランにリンクされたメモも含めて集計する
  const streakDates = useMemo(() => {
    if (selectedPlanId === null) return [];
    const ids = new Set([selectedPlanId, ...descendantIds(selectedPlanId)]);
    return notes.filter((n) => n.links.some((id) => ids.has(id))).map((n) => n.created_at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, selectedPlanId, plans]);
  const currentStreak = useMemo(() => calculateStreakStats(streakDates), [streakDates]);
  // 振り返り画面用。プラン単位ではなく、全メモを対象にした通算の継続日数
  const overallStreak = useMemo(
    () => calculateStreakStats(notes.map((n) => n.created_at)),
    [notes]
  );

  // ---- 習慣リスト（固定ペースの繰り返しやること。頻度はメモごとに自由設定し、設定した日数そのものでグループ化する） ----
  const routineNotes = useMemo(() => notes.filter((n) => n.review_interval_days), [notes]);
  // 未チェック＝期日が来ているもの。期日を過ぎるとチェック済みから自動でこちらへ戻る
  const dueRoutineNotes = useMemo(
    () => routineNotes.filter((n) => isRoutineDue(userId, n.id, n.review_interval_days)),
    // routineVersionの変化をトリガーに、localStorage側の完了記録を読み直させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routineNotes, userId, routineVersion]
  );
  // 期日が来た復習がたまっていれば、アプリを開いたタイミングで通知する。
  // 設定でオンにしていて、かつブラウザの許可がある場合だけ実際に表示される
  // （同じ日に何度も鳴らない抑制はnotifications側で行っている）。
  // インストール済みPWAではアイコンにも件数バッジを出す
  useEffect(() => {
    if (loading) return;
    updateAppBadge(dueRoutineNotes.length);
    void maybeNotifyReview(dueRoutineNotes.length);
  }, [loading, dueRoutineNotes.length]);

  // チェック済み＝直近で完了し、まだ次の期日が来ていないもの
  const checkedRoutineNotes = useMemo(() => {
    const dueIds = new Set(dueRoutineNotes.map((n) => n.id));
    return routineNotes.filter((n) => !dueIds.has(n.id));
  }, [routineNotes, dueRoutineNotes]);

  // 設定した日数そのものをグループの見出しにする（昇順）
  const groupByDays = (list: Note[]): [number, Note[]][] => {
    const byDays = new Map<number, Note[]>();
    for (const note of list) {
      const days = note.review_interval_days!;
      const group = byDays.get(days) ?? [];
      group.push(note);
      byDays.set(days, group);
    }
    return Array.from(byDays.entries()).sort(([a], [b]) => a - b);
  };
  const dueRoutineGroups = useMemo(() => groupByDays(dueRoutineNotes), [dueRoutineNotes]);
  const checkedRoutineGroups = useMemo(() => groupByDays(checkedRoutineNotes), [checkedRoutineNotes]);

  const handleRoutineCheck = (note: Note) => {
    markRoutineDone(userId, note.id);
    setRoutineVersion((v) => v + 1);
  };
  const handleRoutineUncheck = (note: Note) => {
    clearRoutineDone(userId, note.id);
    setRoutineVersion((v) => v + 1);
  };

  const openNoteDetail = (note: Note) => {
    setEditingNote(note);
    setNoteFixedPlanId(undefined);
    setNoteDialogOpen(true);
  };

  // 習慣リストから開く復習。自己採点の結果で次に出す間隔を伸縮させ、
  // 覚えているものほど間隔が空くようにする（簡易的な間隔反復）。
  // 「覚えていた」はチェック済みにもして、その日の分から消えるようにする
  const handleGradeReview = async (note: Note, remembered: boolean) => {
    const current = note.review_interval_days ?? 1;
    // 覚えていたら倍に伸ばす（上限60日）。あやふやなら1日に戻して翌日また出す
    const next = remembered ? Math.min(current * 2, 60) : 1;
    setReviewNoteId(null);
    if (remembered) handleRoutineCheck(note);
    void commitStudyLog(note.type, note.title, remembered ? "復習した" : "復習した（要再確認）");
    if (next === current) return;
    try {
      await dataSource.updateNote(note.id, {
        type: note.type,
        title: note.title,
        body: note.body,
        mastery: note.mastery,
        progress: note.progress,
        important: note.important,
        category_id: note.category_id,
        tags: note.tags,
        todo_items: note.todo_items,
        review_interval_days: next,
      });
      showToast(
        remembered ? `次の復習は${next}日後にします。` : "明日もう一度出します。",
        "success"
      );
      await fetchAll();
    } catch (err) {
      showToast(errorMessage(err, "復習間隔の更新に失敗しました。"), "error");
    }
  };

  // チェック済み（未到来）のうち、頻度が2日以上のものだけ次の期日までの残り日数を添える。
  // 未チェック（期日が来たもの）は残りが常に0以下で意味を持たないため対象外
  const renderRoutineRow = (note: Note, checked: boolean) => {
    const remainingDays =
      checked && note.review_interval_days && note.review_interval_days >= 2
        ? getRemainingDays(userId, note.id, note.review_interval_days)
        : null;
    return (
      <Paper key={note.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 0.5 }}>
        <Checkbox checked={checked} onChange={() => (checked ? handleRoutineUncheck(note) : handleRoutineCheck(note))} />
        <Stack sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => openNoteDetail(note)}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              noWrap
              sx={{
                fontWeight: 600,
                textDecoration: checked ? "line-through" : "none",
                color: checked ? "text.disabled" : "text.primary",
              }}
            >
              {note.title}
            </Typography>
            {remainingDays !== null && (
              <Chip label={`あと${remainingDays}日`} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
            )}
          </Stack>
          {note.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
              {note.tags.map((tag) => (
                <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
              ))}
            </Stack>
          )}
        </Stack>
        {/* 復習ボタンは学習用メモにだけ出す。本文があれば、編集ではなく復習として開ける。
            穴埋め([[ ]])があれば伏字で出題され、無ければ read-only で読み返せる */}
        {note.type === "learning" && note.body?.trim() && (
          <Button
            size="small"
            variant={hasCloze(note.body) ? "contained" : "outlined"}
            startIcon={<PsychologyOutlinedIcon fontSize="small" />}
            onClick={() => setReviewNoteId(note.id)}
            sx={{ flexShrink: 0 }}
          >
            復習
          </Button>
        )}
        <IconButton size="small" onClick={() => openNoteDetail(note)} aria-label="詳細を見る">
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Paper>
    );
  };

  // ---- プラン ----
  const handleSavePlan = async (data: PlanInput) => {
    try {
      if (editingPlan) {
        await dataSource.updatePlan(editingPlan.id, data);
        showToast("プランを更新しました。", "success");
      } else {
        const newId = await dataSource.createPlan(data);
        if (pendingLinkNoteId !== null) {
          await dataSource.linkNote(pendingLinkNoteId, newId);
          showToast("プランを作成し、メモをリンクしました。", "success");
        } else {
          showToast("プランを作成しました。", "success");
        }
      }
      setPendingLinkNoteId(null);
      await fetchAll();
    } catch (err) {
      showToast(errorMessage(err, "プランの保存に失敗しました。"), "error");
      throw err;
    }
  };

  const handleApplyGoalTemplate = async (template: GoalTemplate) => {
    if (applyingTemplateId !== null) return;
    setApplyingTemplateId(template.id);
    try {
      const goalId = await dataSource.createPlan({
        parent_id: null,
        title: template.title,
        description: template.description,
        status: "not_started",
        start_date: null,
        due_date: null,
      });
      for (const title of template.steps) {
        await dataSource.createPlan({
          parent_id: goalId,
          title,
          description: null,
          status: "not_started",
          start_date: null,
          due_date: null,
        });
      }
      await fetchAll();
      showToast("目標テンプレートを作成しました。内容は自由に編集できます。", "success");
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "テンプレートの作成に失敗しました。"), "error");
      await fetchAll();
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleReparentPlan = async (id: number, newParentId: number | null) => {
    try {
      await dataSource.reparentPlan(id, newParentId);
      showToast("プランを移動しました。", "success");
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "プランの移動に失敗しました。"), "error");
    }
  };

  // 統合ボードはどのプランでも同じ行として並べて表示するため、ドロップ先が別の親の兄弟内でも
  // 「そこへ移動しつつ順番も合わせる」を1操作でできるようにする（自由に動かせる、が今回の要件）
  const handlePlanDrop = async (draggedId: number, targetId: number, mode: "before" | "after" | "nest") => {
    if (mode === "nest") {
      await handleReparentPlan(draggedId, targetId);
      return;
    }
    const dragged = planById.get(draggedId);
    const target = planById.get(targetId);
    if (!dragged || !target) return;
    const newParentId = target.parent_id;
    const reparenting = newParentId !== dragged.parent_id;
    const siblings = plans
      .filter((p) => p.parent_id === newParentId && p.id !== draggedId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const targetIndex = siblings.findIndex((p) => p.id === targetId);
    const orderedIds = siblings.map((p) => p.id);
    orderedIds.splice(mode === "before" ? targetIndex : targetIndex + 1, 0, draggedId);

    try {
      if (reparenting) {
        await dataSource.reparentPlan(draggedId, newParentId);
      }
      await dataSource.reorderPlans(orderedIds.map((id, index) => ({ id, sort_order: index })));
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "並べ替えに失敗しました。"), "error");
      fetchAll();
    }
  };

  // どの画面から操作しても「ルート＝独立した目標」に戻す、という意味は変わらない
  const handlePromotePlan = (id: number) => handleReparentPlan(id, null);

  // ドラッグができない・やりにくい環境向けの代替操作。「⋮」メニューの上へ/下へ移動から呼ばれる
  const handleMoveSibling = async (plan: Plan, direction: "up" | "down") => {
    const siblings = plans.filter((p) => p.parent_id === plan.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex((p) => p.id === plan.id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapWith < 0 || swapWith >= siblings.length) return;
    const ids = siblings.map((p) => p.id);
    [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
    try {
      await dataSource.reorderPlans(ids.map((id, index) => ({ id, sort_order: index })));
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "並べ替えに失敗しました。"), "error");
      fetchAll();
    }
  };

  // ---- メモ ----
  // 学習ログをGitHubへ1行追記する（設定でオンにしている場合のみ）。
  // ここが失敗してもメモの保存自体は成功しているため、操作は失敗扱いにせず、
  // 記録が残らなかったことだけを控えめに知らせる
  const commitStudyLog = async (noteType: Note["type"], title: string, action: string) => {
    if (!isStudyLogCommitEnabled()) return;
    // 学習用メモだけを対象にする。通常メモの走り書きやチェック用のtodo消化まで
    // 混ざると、学習ログとして読み返したときに何を学んだのかが埋もれてしまうため
    if (noteType !== "learning") return;
    if (!octokit || !githubLogin || !repoName) return;
    try {
      await appendStudyLog(octokit, githubLogin, repoName, { title, action });
    } catch (err) {
      console.error("学習ログのコミットに失敗しました", err);
      showToast("学習ログをGitHubに記録できませんでした。", "info");
    }
  };

  const handleSaveNote = async (data: NoteInput) => {
    try {
      if (editingNote) {
        await dataSource.updateNote(editingNote.id, data);
        showToast("メモを更新しました。", "success");
      } else {
        await dataSource.createNote(data);
        showToast("メモを作成しました。", "success");
      }
      await fetchAll();
      // 保存が確定してから記録する（失敗した操作を草にしないため）
      void commitStudyLog(data.type, data.title, editingNote ? "メモを更新" : "メモを作成");
    } catch (err) {
      showToast(errorMessage(err, "メモの保存に失敗しました。"), "error");
      throw err;
    }
  };

  const handleToggleTodo = async (todoItemId: number, checked: boolean) => {
    setNotes((prev) =>
      prev.map((n) => ({ ...n, todo_items: n.todo_items.map((t) => (t.id === todoItemId ? { ...t, checked } : t)) }))
    );
    try {
      await dataSource.toggleNoteTodo(todoItemId, checked);
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "todoの更新に失敗しました。"), "error");
      fetchAll();
    }
  };

  const handleLinkNote = async (note: Note, planId: number) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, links: [...n.links, planId] } : n)));
    try {
      await dataSource.linkNote(note.id, planId);
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "リンクに失敗しました。"), "error");
      fetchAll();
    }
  };

  const handleUnlinkNote = async (note: Note, planId: number) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, links: n.links.filter((p) => p !== planId) } : n)));
    try {
      await dataSource.unlinkNote(note.id, planId);
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "リンク解除に失敗しました。"), "error");
      fetchAll();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "plan") {
        await dataSource.deletePlan(deleteTarget.plan.id);
        if (selectedPlanId === deleteTarget.plan.id) setSelectedPlanId(deleteTarget.plan.parent_id);
      } else {
        await dataSource.deleteNote(deleteTarget.note.id);
      }
      showToast("削除しました。", "success");
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "削除に失敗しました。"), "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  // メモをドラッグして「新しいプランとして保存」（実際のドラッグ処理自体はNoteTrayが持つ）
  const handleCreatePlanFromNote = (note: Note) => {
    setPendingLinkNoteId(note.id);
    setEditingPlan(null);
    setCreateParentId(null);
    setPlanDialogOpen(true);
  };

  // メモに設定されたカテゴリーの名前。カテゴリーはこれまで保存されるだけで
  // どこにも表示されず、検索にも掛からなかったため、表示・検索の両方で使う
  const categoryNameOf = (note: Note): string | null =>
    categories.find((c) => c.id === note.category_id)?.name ?? null;

  const libraryNotes = useMemo(() => {
    let list = libraryTypeFilter === "all" ? notes : notes.filter((n) => n.type === libraryTypeFilter);
    if (libraryCategoryFilter !== "all") {
      list = list.filter((n) => n.category_id === libraryCategoryFilter);
    }
    const q = noteSearchQuery.trim().toLowerCase();
    if (q) {
      const nameOf = (n: Note) => categories.find((c) => c.id === n.category_id)?.name ?? "";
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.body ?? "").toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)) ||
          nameOf(n).toLowerCase().includes(q)
      );
    }
    return list;
  }, [notes, libraryTypeFilter, libraryCategoryFilter, noteSearchQuery, categories]);

  // プランボードの検索。マッチしたプランに加え、階層が分かるよう祖先・子孫も表示する
  const filteredPlans = useMemo(() => {
    const q = planSearchQuery.trim().toLowerCase();
    if (!q) return plans;
    const matchIds = plans.filter((p) => p.title.toLowerCase().includes(q)).map((p) => p.id);
    if (matchIds.length === 0) return [];
    const included = new Set(matchIds);
    for (const id of matchIds) {
      let cursor = planById.get(id)?.parent_id ?? null;
      while (cursor !== null && !included.has(cursor)) {
        included.add(cursor);
        cursor = planById.get(cursor)?.parent_id ?? null;
      }
    }
    const stack = [...matchIds];
    while (stack.length > 0) {
      const id = stack.pop()!;
      for (const p of plans) {
        if (p.parent_id === id && !included.has(p.id)) {
          included.add(p.id);
          stack.push(p.id);
        }
      }
    }
    return plans.filter((p) => included.has(p.id));
  }, [plans, planSearchQuery, planById]);

  const pendingLinkNote = pendingLinkNoteId !== null ? notes.find((n) => n.id === pendingLinkNoteId) ?? null : null;

  // プレビュー中のメモ。編集・添付追加のあとにnotesが差し替わっても最新が映るよう、
  // 控えを持たずIDから毎回引き直す（メモが削除された場合は自動的に閉じる）
  const previewNote = previewNoteId !== null ? notes.find((n) => n.id === previewNoteId) ?? null : null;
  const reviewNote = notes.find((n) => n.id === reviewNoteId) ?? null;

  // フッター「その他」に並べる項目。ゲストモードではアカウントが無いので
  // 「アカウント情報」は出さず、設定の中身だけを使えるようにする
  const moreMenuItems: { icon: ReactNode; label: string; description: string; onClick: () => void }[] = [
    ...(userId !== null
      ? [
          {
            icon: <ManageAccountsOutlinedIcon color="action" />,
            label: "アカウント情報",
            description: "ログイン中のアカウントと、GitHub・Googleの連携",
            onClick: () => setAccountInfoOpen(true),
          },
        ]
      : []),
    {
      icon: <InsightsOutlinedIcon color="action" />,
      label: "振り返り",
      description: "今月の積み上げと、共有用のまとめ",
      onClick: () => setSummaryOpen(true),
    },
    {
      icon: <CalendarMonthOutlinedIcon color="action" />,
      label: "スケジュール",
      description: "プランの開始日・期限日をカレンダーで確認",
      onClick: () => setScheduleOpen(true),
    },
    {
      icon: <SettingsOutlinedIcon color="action" />,
      label: "設定",
      description: userId !== null ? "画面の明るさ、ログアウト" : "画面の明るさ、ゲストデータの消去",
      onClick: () => setSettingsOpen(true),
    },
    {
      icon: <QuizOutlinedIcon color="action" />,
      label: "よくある質問",
      description: "保存先・進捗の仕組み・オフラインなど",
      onClick: () => setFaqOpen(true),
    },
    {
      icon: <MenuBookIcon color="action" />,
      label: "使い方",
      description: "目標を立ててから振り返るまでの流れ",
      onClick: () => setUsageGuideOpen(true),
    },
    {
      icon: <LoyaltyOutlinedIcon color="action" />,
      label: "プラン",
      description: "ご利用中の料金プランと、含まれる機能",
      onClick: () => setPricingPlanOpen(true),
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
      {/* テーマのMuiAppBarには紫のグラデーション背景を入れてあるが、あれはランディング
          ページ用。color="default"のこのヘッダーにも効いてしまい、text.secondaryの
          アカウント名が紫地の上のグレー文字になってライトモードでほとんど読めなかった。
          ここでは背景を明示的に打ち消して、地の色と文字色を揃える */}
      <AppBar
        position="sticky"
        color="default"
        elevation={1}
        sx={{ backgroundImage: "none", bgcolor: "background.paper", color: "text.primary" }}
      >
        <Toolbar>
          <FlagOutlinedIcon color="primary" sx={{ mr: 1 }} />
          {/* サービス名はどの画面にも出るブランド表示であって、その画面の見出しではない。
              h6のままだと画面見出し(h1)より前に上位でない見出しが挟まり、読み上げ時の
              構造がおかしくなるため、見た目だけh6でマークアップはdivにする */}
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, flex: 1 }}>
            ツミアゲ
          </Typography>
          {/* アカウント連携・明るさ切り替え・ログアウトは、フッターの「その他」へ移した。
              アイコンだけが並んでいて何のボタンか分かりにくく、ログアウトを誤って
              押しやすい位置でもあったため */}
          <Button
            size="small"
            startIcon={<TodayOutlinedIcon />}
            onClick={() => setTodayNextOpen(true)}
            aria-label="今日やること・次にやること"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            今日やること
          </Button>
          <IconButton
            onClick={() => setTodayNextOpen(true)}
            aria-label="今日やること・次にやること"
            sx={{ display: { xs: "inline-flex", sm: "none" } }}
          >
            <TodayOutlinedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {topBanner}

      {offline && (
        <Alert
          severity="warning"
          icon={<WifiOffIcon fontSize="small" />}
          sx={{ borderRadius: 0 }}
          action={
            <Button color="inherit" size="small" onClick={fetchAll}>
              再読み込み
            </Button>
          }
        >
          オフライン表示中です{offlineCacheTs ? `（${new Date(offlineCacheTs).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}時点）` : ""}。
          変更の保存にはオンラインへの復帰が必要です。
        </Alert>
      )}

      <Container
        maxWidth="md"
        sx={{
          pt: 4,
          // メモトレイが展開されている間は、その高さぶん下に余白を足す。
          // トレイはposition:fixedで画面下半分に重なるため、余白がないと
          // 最後のプラン行がトレイの下に隠れたまま出せなくなる
          pb: noteTrayOpen && bottomTab === "plans" ? { xs: `calc(${NOTE_TRAY_EXPANDED_HEIGHT.xs} + 32px)`, sm: `calc(${NOTE_TRAY_EXPANDED_HEIGHT.sm} + 32px)` } : 4,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : bottomTab === "more" ? (
          <Stack spacing={2}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              その他
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <List disablePadding>
                {moreMenuItems.map((item, index) => (
                  <ListItemButton
                    key={item.label}
                    onClick={item.onClick}
                    sx={{ borderTop: index === 0 ? "none" : "1px solid", borderColor: "divider", py: 1.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                      slotProps={{ primary: { fontWeight: 700 } }}
                    />
                    <ChevronRightOutlinedIcon fontSize="small" color="action" />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Stack>
        ) : bottomTab === "review" ? (
          <Stack spacing={3}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              習慣リスト
            </Typography>

            {routineNotes.length === 0 ? (
              <Stack spacing={1} alignItems="center" sx={{ py: 6 }}>
                <SentimentSatisfiedAltIcon sx={{ fontSize: 48, color: "success.main" }} />
                <Typography color="text.secondary">今、対応することはありません。</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                  メモの編集画面で「繰り返し」を設定すると、ここに表示されます。
                </Typography>
              </Stack>
            ) : (
              <>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    未チェック（{dueRoutineNotes.length}）
                  </Typography>
                  {dueRoutineNotes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      今、対応することはありません。
                    </Typography>
                  ) : (
                    dueRoutineGroups.map(([days, groupNotes]) => (
                      <Stack key={days} spacing={1}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {days}日ごと
                        </Typography>
                        {groupNotes.map((note) => renderRoutineRow(note, false))}
                      </Stack>
                    ))
                  )}
                </Stack>

                {checkedRoutineNotes.length > 0 && (
                  <Stack spacing={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      チェック済み（{checkedRoutineNotes.length}）
                    </Typography>
                    {checkedRoutineGroups.map(([days, groupNotes]) => (
                      <Stack key={days} spacing={1}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {days}日ごと
                        </Typography>
                        {groupNotes.map((note) => renderRoutineRow(note, true))}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Stack>
        ) : bottomTab === "library" ? (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                メモライブラリ
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setEditingNote(null);
                  setNoteFixedPlanId(undefined);
                  setNoteDialogOpen(true);
                }}
              >
                新しいメモ
              </Button>
            </Stack>
            <TextField
              size="small"
              placeholder="タイトル・本文・タグ・カテゴリーで検索"
              value={noteSearchQuery}
              onChange={(e) => setNoteSearchQuery(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
              fullWidth
            />
            <ToggleButtonGroup
              value={libraryTypeFilter}
              exclusive
              size="small"
              onChange={(_, v) => v && setLibraryTypeFilter(v)}
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="all">すべて</ToggleButton>
              <ToggleButton value="learning">{NOTE_TYPE_LABEL.learning}</ToggleButton>
              <ToggleButton value="task">{NOTE_TYPE_LABEL.task}</ToggleButton>
              <ToggleButton value="normal">{NOTE_TYPE_LABEL.normal}</ToggleButton>
            </ToggleButtonGroup>

            {/* カテゴリーは数が増えるとトグルでは並べきれないため、選択式にする。
                1件も作られていない間は出しても選べるものが無いので隠す */}
            {categories.length > 0 && (
              <TextField
                select
                size="small"
                label="カテゴリー"
                value={libraryCategoryFilter}
                onChange={(e) =>
                  setLibraryCategoryFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                sx={{ minWidth: 200, alignSelf: "flex-start" }}
              >
                <MenuItem value="all">すべて</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {libraryNotes.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
                {noteSearchQuery.trim() ||
                libraryTypeFilter !== "all" ||
                libraryCategoryFilter !== "all"
                  ? "条件に一致するメモがありません。"
                  : "まだメモがありません。「新しいメモ」から作成しましょう。プランに紐付けなくても保存できます。"}
              </Typography>
            ) : (
              libraryNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  planOptions={planOptions}
                  onEdit={() => {
                    setEditingNote(note);
                    setNoteFixedPlanId(undefined);
                    setNoteDialogOpen(true);
                  }}
                  onDelete={() => setDeleteTarget({ kind: "note", note })}
                  onToggleTodo={handleToggleTodo}
                  onLink={(planId) => handleLinkNote(note, planId)}
                  onUnlink={(planId) => handleUnlinkNote(note, planId)}
                  categoryName={categoryNameOf(note)}
                />
              ))
            )}
          </Stack>
        ) : !selectedPlan ? (
          <Stack spacing={2}>
            {plans.length > 0 && (
              <DashboardOverview
                plans={plans}
                notes={notes}
                userId={userId}
                currentStreak={overallStreak.current}
                onOpenToday={() => setTodayNextOpen(true)}
                onOpenSummary={() => setSummaryOpen(true)}
                onOpenNote={(note) => setPreviewNoteId(note.id)}
              />
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                  プランボード
                </Typography>
                <IconButton size="small" onClick={() => setBoardHelpOpen(true)} aria-label="プランボードの使い方">
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setEditingPlan(null);
                  setCreateParentId(null);
                  setPlanDialogOpen(true);
                }}
              >
                新しい目標
              </Button>
            </Stack>

            <TextField
              size="small"
              placeholder="プランをタイトルで検索"
              value={planSearchQuery}
              onChange={(e) => setPlanSearchQuery(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
              fullWidth
            />

            {plans.length === 0 && !planSearchQuery.trim() && (
              <GoalTemplates
                applyingId={applyingTemplateId}
                onApply={handleApplyGoalTemplate}
                onCreateBlank={() => {
                  setEditingPlan(null);
                  setCreateParentId(null);
                  setPlanDialogOpen(true);
                }}
              />
            )}

            {draggingNoteId !== null && (
              // position:fixedのオーバーレイにして通常のレイアウトフローに参加させない
              // （挿入時に下のプランツリーがずれてヒットテストが不安定になるのを防ぐ）
              <Paper
                data-drop-create-plan="true"
                variant="outlined"
                sx={{
                  position: "fixed",
                  top: 72,
                  left: 16,
                  right: 16,
                  maxWidth: 600,
                  mx: "auto",
                  zIndex: (t) => t.zIndex.appBar + 1,
                  p: 1.5,
                  borderRadius: 2,
                  borderStyle: "dashed",
                  textAlign: "center",
                  color: "text.secondary",
                  borderColor: noteHoverCreateZone ? "success.main" : "divider",
                  bgcolor: noteHoverCreateZone ? "action.hover" : "background.paper",
                  boxShadow: 3,
                }}
              >
                <NoteAddOutlinedIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                ここにメモをドロップで新しい目標を作成
              </Paper>
            )}

            {plans.length === 0 && !planSearchQuery.trim() ? null : planSearchQuery.trim() && filteredPlans.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                検索条件に一致するプランがありません。
              </Typography>
            ) : (
              <PlanTree
                plans={filteredPlans}
                rootParentId={null}
                isExpanded={isExpanded}
                onToggleExpand={toggleExpand}
                onSelect={(plan) => setSelectedPlanId(plan.id)}
                onEdit={(plan) => {
                  setEditingPlan(plan);
                  setPlanDialogOpen(true);
                }}
                onDelete={(plan) => setDeleteTarget({ kind: "plan", plan })}
                onDrop={handlePlanDrop}
                onPromoteToRoot={handlePromotePlan}
                noteDropHighlightId={noteHoverPlanId}
                onMoveSibling={handleMoveSibling}
                onOpenReparentPicker={setReparentPickerPlan}
              />
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Breadcrumbs>
              <Link component="button" underline="hover" onClick={() => setSelectedPlanId(null)}>
                プランボード
              </Link>
              {breadcrumbChain(selectedPlan.id).map((p, i, arr) =>
                i === arr.length - 1 ? (
                  <Typography key={p.id} color="text.primary">
                    {p.title}
                  </Typography>
                ) : (
                  <Link key={p.id} component="button" underline="hover" onClick={() => setSelectedPlanId(p.id)}>
                    {p.title}
                  </Link>
                )
              )}
            </Breadcrumbs>

            <Box
              data-plan-id={selectedPlan.id}
              sx={{
                borderRadius: 2,
                p: noteHoverPlanId === selectedPlan.id ? 1.5 : 0,
                outline: noteHoverPlanId === selectedPlan.id ? "2px solid" : "none",
                outlineColor: "success.main",
                bgcolor: noteHoverPlanId === selectedPlan.id ? "action.hover" : "transparent",
                transition: "padding .1s",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                    {selectedPlan.title}
                  </Typography>
                  <Chip label={PLAN_STATUS_LABEL[selectedPlan.status]} size="small" />
                  <DeadlineChip value={selectedPlan.due_date} />
                </Stack>
                <Stack direction="row" spacing={1}>
                  {streakDates.length > 0 && (
                    <Button
                      startIcon={<LocalFireDepartmentIcon sx={{ color: "#f97316" }} />}
                      variant="outlined"
                      onClick={() => setStreakDialogOpen(true)}
                    >
                      継続 {currentStreak.current}日
                    </Button>
                  )}
                  <IconButton onClick={() => { setEditingPlan(selectedPlan); setPlanDialogOpen(true); }} aria-label="編集">
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => setDeleteTarget({ kind: "plan", plan: selectedPlan })} aria-label="削除">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              {selectedPlan.description && (
                <Typography color="text.secondary">{selectedPlan.description}</Typography>
              )}
              <Box sx={{ maxWidth: 320, mt: 1 }}>
                <ProgressBadge value={selectedPlan.progress} />
              </Box>
              {draggingNoteId !== null && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  （メモをここにドロップでもリンクできます）
                </Typography>
              )}
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">
                子プラン（アクションプラン）
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingPlan(null);
                  setCreateParentId(selectedPlan.id);
                  setPlanDialogOpen(true);
                }}
              >
                追加
              </Button>
            </Stack>
            <PlanTree
              plans={plans}
              rootParentId={selectedPlan.id}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              onSelect={(plan) => setSelectedPlanId(plan.id)}
              onEdit={(plan) => {
                setEditingPlan(plan);
                setPlanDialogOpen(true);
              }}
              onDelete={(plan) => setDeleteTarget({ kind: "plan", plan })}
              onDrop={handlePlanDrop}
              onPromoteToRoot={handlePromotePlan}
              noteDropHighlightId={noteHoverPlanId}
              onMoveSibling={handleMoveSibling}
              onOpenReparentPicker={setReparentPickerPlan}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                リンク済みメモ
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingNote(null);
                  setNoteFixedPlanId(selectedPlan.id);
                  setNoteDialogOpen(true);
                }}
              >
                新しいメモ
              </Button>
            </Stack>
            {notesLinkedTo(selectedPlan.id).length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                まだリンクされたメモがありません。下の「未整理のメモ」から紐づけ先を選ぶか、「+」から新規作成できます。
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {notesLinkedTo(selectedPlan.id).map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    planOptions={planOptions}
                    onEdit={() => {
                      setEditingNote(note);
                      setNoteFixedPlanId(undefined);
                      setNoteDialogOpen(true);
                    }}
                    onDelete={() => setDeleteTarget({ kind: "note", note })}
                    onToggleTodo={handleToggleTodo}
                    onLink={(planId) => handleLinkNote(note, planId)}
                    onUnlink={(planId) => handleUnlinkNote(note, planId)}
                    categoryName={categoryNameOf(note)}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {/* ゲスト・フリープラン向けの広告枠。AdSenseの発行者ID/広告ユニットIDを
            環境変数に設定するまでは何も描画されないため、審査中は今までどおり
            何も表示されない（設定した時点で有効になる） */}
        {!loading && <AdBanner />}
      </Container>

      {!loading && bottomTab === "plans" && (
        <NoteTray
          notes={notes}
          planOptions={planOptions}
          selectedPlanId={selectedPlanId}
          expanded={noteTrayOpen}
          onToggleExpanded={() => setNoteTrayOpen((v) => !v)}
          onLinkNote={handleLinkNote}
          onCreatePlanFromNote={handleCreatePlanFromNote}
          onPreviewNote={(note) => setPreviewNoteId(note.id)}
          onDraggingChange={setDraggingNoteId}
          onHoverPlanChange={setNoteHoverPlanId}
          onHoverCreateZoneChange={setNoteHoverCreateZone}
        />
      )}

      <Paper elevation={3} sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar }}>
        {/* showLabelsを付けないと、選択中以外のタブはアイコンだけになる。
            「その他」の「…」は単体では何を指すか分からないため、常にラベルを出す */}
        <BottomNavigation
          showLabels
          value={bottomTab}
          onChange={(_, v) => {
            setBottomTab(v);
            if (v === "plans") setSelectedPlanId(null);
          }}
        >
          <BottomNavigationAction label="プラン" value="plans" icon={<FlagOutlinedIcon />} />
          <BottomNavigationAction label="メモ" value="library" icon={<DescriptionOutlinedIcon />} />
          <BottomNavigationAction
            label="習慣"
            value="review"
            icon={
              <Badge badgeContent={dueRoutineNotes.length} color="error">
                <ChecklistIcon />
              </Badge>
            }
          />
          <BottomNavigationAction label="その他" value="more" icon={<MoreHorizIcon />} />
        </BottomNavigation>
      </Paper>

      <PlanFormDialog
        open={planDialogOpen}
        onClose={() => {
          setPlanDialogOpen(false);
          setPendingLinkNoteId(null);
        }}
        onSubmit={handleSavePlan}
        parentId={createParentId}
        parentTitle={selectedPlan?.title}
        initialPlan={editingPlan}
        linkingNoteTitle={pendingLinkNote?.title ?? null}
      />

      <PlanSelectDialog
        open={!!reparentPickerPlan}
        onClose={() => setReparentPickerPlan(null)}
        title={reparentPickerPlan ? `「${reparentPickerPlan.title}」の移動先を選ぶ` : ""}
        options={reparentOptions}
        onSelect={(planId) => {
          if (reparentPickerPlan) handleReparentPlan(reparentPickerPlan.id, planId);
        }}
      />

      <NoteFormDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        onSubmit={handleSaveNote}
        initialNote={editingNote}
        fixedPlanId={noteFixedPlanId}
        categories={categories}
        tagOptions={tagOptions}
        onCreateCategory={async (name) => {
          const created = await dataSource.createCategory(name);
          setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ja")));
          return created;
        }}
        onAddAttachment={
          editingNote
            ? async (attachment: Omit<NoteAttachment, "id" | "note_id">) => {
                await dataSource.addNoteAttachment(editingNote.id, attachment);
                await fetchAll();
              }
            : undefined
        }
        onDeleteAttachment={
          editingNote
            ? async (attachmentId: number) => {
                await dataSource.deleteNoteAttachment(attachmentId);
                await fetchAll();
              }
            : undefined
        }
      />

      <Suspense fallback={null}>
        {selectedPlan && streakDialogOpen && (
          <StreakDialog open onClose={() => setStreakDialogOpen(false)} dates={streakDates} />
        )}
      </Suspense>

      {/* 以下のダイアログは開いたときだけ読み込む（lazy）。常にマウントしておくと
          初回表示のJSに全部含まれてしまい、ほとんど開かれない説明系の画面まで
          起動時のダウンロードに乗ってしまうため。開くまでは何も描画しないので
          Suspenseのfallbackも不要 */}
      <Suspense fallback={null}>
        {todayNextOpen && (
          <TodayNextDialog
            open={todayNextOpen}
            onClose={() => setTodayNextOpen(false)}
            plans={plans}
            notes={notes}
            userId={userId}
            onOpenPlan={(planId) => {
              setTodayNextOpen(false);
              setBottomTab("plans");
              setSelectedPlanId(planId);
            }}
          />
        )}
        {boardHelpOpen && <PlanBoardHelpDialog open onClose={() => setBoardHelpOpen(false)} />}
        {accountInfoOpen && <AccountInfoDialog open onClose={() => setAccountInfoOpen(false)} />}
        {settingsOpen && (
          <SettingsDialog
            open
            onClose={() => setSettingsOpen(false)}
            onLogout={onLogout}
            isGuest={userId === null}
            canCommitStudyLog={!!octokit && !!githubLogin && !!repoName}
            reviewCount={dueRoutineNotes.length}
          />
        )}
        {faqOpen && <FaqDialog open onClose={() => setFaqOpen(false)} />}
        {usageGuideOpen && <UsageGuideDialog open onClose={() => setUsageGuideOpen(false)} />}
        {pricingPlanOpen && <PricingPlanDialog open onClose={() => setPricingPlanOpen(false)} />}
        {summaryOpen && (
          <SummaryDialog
            open
            onClose={() => setSummaryOpen(false)}
            plans={plans}
            notes={notes}
            currentStreak={overallStreak.current}
          />
        )}
        {scheduleOpen && (
          <ScheduleDialog
            open
            onClose={() => setScheduleOpen(false)}
            plans={plans}
            onOpenPlan={(planId) => {
              setScheduleOpen(false);
              setBottomTab("plans");
              setSelectedPlanId(planId);
            }}
          />
        )}
      </Suspense>

      <ReviewDialog note={reviewNote} onClose={() => setReviewNoteId(null)} onGrade={handleGradeReview} />

      <NotePreviewDialog
        note={previewNote}
        onClose={() => setPreviewNoteId(null)}
        planOptions={planOptions}
        onEdit={(note) => {
          setPreviewNoteId(null);
          setEditingNote(note);
          setNoteFixedPlanId(undefined);
          setNoteDialogOpen(true);
        }}
        onDelete={(note) => {
          setPreviewNoteId(null);
          setDeleteTarget({ kind: "note", note });
        }}
        onToggleTodo={handleToggleTodo}
        onLink={(note, planId) => handleLinkNote(note, planId)}
        onUnlink={(note, planId) => handleUnlinkNote(note, planId)}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget?.kind === "plan" &&
              `「${deleteTarget.plan.title}」を削除します。子プランは1段上に繰り上がり、リンクされていたメモは削除されません。`}
            {deleteTarget?.kind === "note" && `メモ「${deleteTarget.note.title}」を削除します。`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
