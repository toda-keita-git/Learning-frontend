import { useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
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
import LogoutIcon from "@mui/icons-material/Logout";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChecklistIcon from "@mui/icons-material/Checklist";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Badge from "@mui/material/Badge";
import Checkbox from "@mui/material/Checkbox";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";

import { useToast } from "./ToastContext";
import { ColorModeContext } from "./ColorModeContext";
import { isRoutineDue, markRoutineDone, clearRoutineDone } from "./component/routine";
import StreakDialog from "./component/StreakDialog";
import { calculateStreakStats } from "./component/streakStats";
import RelatedGraphDialog from "./component/RelatedGraphDialog";
import type { PlanDataSource } from "./component/planDataSource";
import type { Plan, Note, NoteInput, PlanInput, CategoryOption, NoteAttachment } from "./component/PlanTypes";
import { PLAN_STATUS_LABEL } from "./component/PlanTypes";
import ProgressBadge from "./component/ProgressBadge";
import PlanFormDialog from "./component/PlanFormDialog";
import PlanTree from "./component/PlanTree";
import NoteTray from "./component/NoteTray";
import NoteFormDialog from "./component/NoteFormDialog";
import type { PlanOption } from "./component/PlanPicker";
import NoteCard from "./component/NoteCard";

type BottomTab = "plans" | "library" | "review";

type DeleteTarget = { kind: "plan"; plan: Plan } | { kind: "note"; note: Note };

interface PlanDashboardProps {
  dataSource: PlanDataSource;
  userId: number | null;
  accountLabel: string | null;
  onLogout: () => void;
  topBanner?: ReactNode;
}

const errorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err) && typeof err.response?.data === "string" && err.response.data) {
    return err.response.data;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

export default function PlanDashboard({ dataSource, userId, accountLabel, onLogout, topBanner }: PlanDashboardProps) {
  const { showToast } = useToast();
  const { mode, toggle } = useContext(ColorModeContext);

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [bottomTab, setBottomTab] = useState<BottomTab>("plans");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  // メモをドラッグして「新しいプランとして保存」した場合、作成成功後にこのメモをリンクする
  const [pendingLinkNoteId, setPendingLinkNoteId] = useState<number | null>(null);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteFixedPlanId, setNoteFixedPlanId] = useState<number | null | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  // ToDoの完了記録はlocalStorage（routine.ts）にあるためReact stateの変化を検知できない。
  // チェック/取り消しのたびにこれをインクリメントし、useMemoの依存に使って再計算させる
  const [routineVersion, setRoutineVersion] = useState(0);
  const [streakDialogOpen, setStreakDialogOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<"all" | Note["type"]>("all");

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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const bundle = await dataSource.fetchAll();
      setPlans(bundle.plans);
      setNotes(bundle.notes);
      setCategories(bundle.categories);
      setTagOptions(bundle.tagOptions);
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "データの取得に失敗しました。時間をおいて再度お試しください。"), "error");
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

  // ---- ToDoリスト（固定ペースの繰り返しやること。頻度はメモごとに自由設定し、設定した日数そのものでグループ化する） ----
  const routineNotes = useMemo(() => notes.filter((n) => n.review_interval_days), [notes]);
  // 未チェック＝期日が来ているもの。期日を過ぎるとチェック済みから自動でこちらへ戻る
  const dueRoutineNotes = useMemo(
    () => routineNotes.filter((n) => isRoutineDue(userId, n.id, n.review_interval_days)),
    // routineVersionの変化をトリガーに、localStorage側の完了記録を読み直させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routineNotes, userId, routineVersion]
  );
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

  const renderRoutineRow = (note: Note, checked: boolean) => (
    <Paper key={note.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 0.5 }}>
      <Checkbox checked={checked} onChange={() => (checked ? handleRoutineUncheck(note) : handleRoutineCheck(note))} />
      <Stack sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => openNoteDetail(note)}>
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
        {note.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
            {note.tags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
      </Stack>
      <IconButton size="small" onClick={() => openNoteDetail(note)} aria-label="詳細を見る">
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Paper>
  );

  // 関連メモグラフ
  const graphItems = useMemo(
    () =>
      notes.map((n) => ({
        id: n.id,
        title: n.title,
        category_name: categories.find((c) => c.id === n.category_id)?.name ?? "",
        tags: n.tags,
        created_at: n.created_at,
      })),
    [notes, categories]
  );
  const handleOpenGraphItem = (id: number) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    setGraphOpen(false);
    setBottomTab("library");
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

  // ---- メモ ----
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

  const libraryNotes = useMemo(() => {
    if (libraryTypeFilter === "all") return notes;
    return notes.filter((n) => n.type === libraryTypeFilter);
  }, [notes, libraryTypeFilter]);

  const pendingLinkNote = pendingLinkNoteId !== null ? notes.find((n) => n.id === pendingLinkNoteId) ?? null : null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar>
          <FlagOutlinedIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
            目標達成支援
          </Typography>
          {accountLabel && (
            <Typography variant="body2" sx={{ color: "text.secondary", mr: 2, display: { xs: "none", sm: "block" } }}>
              {accountLabel}
            </Typography>
          )}
          {notes.length > 1 && (
            <IconButton onClick={() => setGraphOpen(true)} aria-label="関連メモグラフ" sx={{ mr: 1 }}>
              <HubOutlinedIcon />
            </IconButton>
          )}
          <IconButton onClick={toggle} aria-label="テーマ切り替え" sx={{ mr: 1 }}>
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <IconButton onClick={onLogout} aria-label="ログアウト">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {topBanner}

      <Container maxWidth="md" sx={{ py: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : bottomTab === "review" ? (
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              ToDoリスト
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
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
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
            <ToggleButtonGroup
              value={libraryTypeFilter}
              exclusive
              size="small"
              onChange={(_, v) => v && setLibraryTypeFilter(v)}
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="all">すべて</ToggleButton>
              <ToggleButton value="learning">学習用</ToggleButton>
              <ToggleButton value="task">タスク用</ToggleButton>
              <ToggleButton value="normal">通常</ToggleButton>
            </ToggleButtonGroup>

            {libraryNotes.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
                まだメモがありません。「新しいメモ」から作成しましょう。プランに紐付けなくても保存できます。
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
                />
              ))
            )}
          </Stack>
        ) : !selectedPlan ? (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                プランボード
              </Typography>
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
            <Typography variant="caption" color="text.secondary">
              目標・アクションプランを1つのツリーにまとめて表示しています。つまみをドラッグすれば、どの行の上にも自由に並べ替え・入れ子にできます。
            </Typography>

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

            <PlanTree
              plans={plans}
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
            />
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
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {selectedPlan.title}
                  </Typography>
                  <Chip label={PLAN_STATUS_LABEL[selectedPlan.status]} size="small" />
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
                まだリンクされたメモがありません。下のメモトレイからドラッグ、または「+」から新規作成できます。
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
                  />
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Container>

      {!loading && bottomTab === "plans" && (
        <NoteTray
          notes={notes}
          onLinkNote={handleLinkNote}
          onCreatePlanFromNote={handleCreatePlanFromNote}
          onDraggingChange={setDraggingNoteId}
          onHoverPlanChange={setNoteHoverPlanId}
          onHoverCreateZoneChange={setNoteHoverCreateZone}
        />
      )}

      <Paper elevation={3} sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar }}>
        <BottomNavigation
          value={bottomTab}
          onChange={(_, v) => {
            setBottomTab(v);
            if (v === "plans") setSelectedPlanId(null);
          }}
        >
          <BottomNavigationAction label="プラン" value="plans" icon={<FlagOutlinedIcon />} />
          <BottomNavigationAction label="メモ" value="library" icon={<DescriptionOutlinedIcon />} />
          <BottomNavigationAction
            label="ToDo"
            value="review"
            icon={
              <Badge badgeContent={dueRoutineNotes.length} color="error">
                <ChecklistIcon />
              </Badge>
            }
          />
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

      {selectedPlan && (
        <StreakDialog open={streakDialogOpen} onClose={() => setStreakDialogOpen(false)} dates={streakDates} />
      )}

      <RelatedGraphDialog open={graphOpen} onClose={() => setGraphOpen(false)} items={graphItems} onOpenItem={handleOpenGraphItem} />

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
