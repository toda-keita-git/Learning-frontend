import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
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
import Badge from "@mui/material/Badge";
import Checkbox from "@mui/material/Checkbox";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";

import { useToast } from "./ToastContext";
import { ColorModeContext } from "./ColorModeContext";
import { isRoutineDue, markRoutineDone } from "./component/routine";
import StreakDialog from "./component/StreakDialog";
import { calculateStreakStats } from "./component/streakStats";
import RelatedGraphDialog from "./component/RelatedGraphDialog";
import type { PlanDataSource } from "./component/planDataSource";
import type { Plan, Note, NoteInput, PlanInput, CategoryOption, NoteAttachment } from "./component/PlanTypes";
import { PLAN_STATUS_LABEL } from "./component/PlanTypes";
import ProgressBadge from "./component/ProgressBadge";
import PlanFormDialog from "./component/PlanFormDialog";
import PlanList from "./component/PlanList";
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

const LONG_PRESS_MS = 220;

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

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteFixedPlanId, setNoteFixedPlanId] = useState<number | null | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  // TODOチェックリストでチェックした直後、取り消し線を見せてから一覧から消すための一時状態
  const [justChecked, setJustChecked] = useState<Set<number>>(new Set());
  const [streakDialogOpen, setStreakDialogOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<"all" | Note["type"]>("all");

  // メモトレイ⇄タイムライン間のドラッグ（Pointer Events）
  const [draggingNoteId, setDraggingNoteId] = useState<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const [dropZone, setDropZone] = useState<"timeline" | "tray" | null>(null);

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

  const trayNotes = useMemo(() => {
    if (selectedPlanId === null) return [];
    return notes
      .filter((n) => !n.links.includes(selectedPlanId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notes, selectedPlanId]);

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
  const dueRoutineNotes = useMemo(
    () => routineNotes.filter((n) => isRoutineDue(userId, n.id, n.review_interval_days)),
    // justCheckedの変化をトリガーに、localStorage側の完了記録を読み直させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routineNotes, userId, justChecked]
  );
  const routineTodoNotes = useMemo(() => {
    const dueIds = new Set(dueRoutineNotes.map((n) => n.id));
    return routineNotes.filter((n) => dueIds.has(n.id) || justChecked.has(n.id));
  }, [routineNotes, dueRoutineNotes, justChecked]);

  // 設定した日数そのものをグループの見出しにする（昇順）
  const routineGroups = useMemo(() => {
    const byDays = new Map<number, Note[]>();
    for (const note of routineTodoNotes) {
      const days = note.review_interval_days!;
      const list = byDays.get(days) ?? [];
      list.push(note);
      byDays.set(days, list);
    }
    return Array.from(byDays.entries()).sort(([a], [b]) => a - b);
  }, [routineTodoNotes]);

  // やることチェック操作。チェックを見せてから一覧を更新する（連打防止でjustCheckedは合成のまま）
  const handleRoutineCheck = (note: Note) => {
    markRoutineDone(userId, note.id);
    setJustChecked((prev) => new Set(prev).add(note.id));
    window.setTimeout(() => {
      setJustChecked((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
    }, 450);
  };

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
        await dataSource.createPlan(data);
        showToast("プランを作成しました。", "success");
      }
      await fetchAll();
    } catch (err) {
      showToast(errorMessage(err, "プランの保存に失敗しました。"), "error");
      throw err;
    }
  };

  const handleReorderPlans = async (orderedIds: number[]) => {
    setPlans((prev) => {
      const orderById = new Map(orderedIds.map((id, index) => [id, index]));
      return prev.map((p) => (orderById.has(p.id) ? { ...p, sort_order: orderById.get(p.id)! } : p));
    });
    try {
      await dataSource.reorderPlans(orderedIds.map((id, index) => ({ id, sort_order: index })));
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "並べ替えの保存に失敗しました。"), "error");
      fetchAll();
    }
  };

  const handleReparentPlan = async (id: number, newParentId: number) => {
    try {
      await dataSource.reparentPlan(id, newParentId);
      showToast("プランを移動しました。", "success");
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "プランの移動に失敗しました。"), "error");
    }
  };

  const handlePromotePlan = async (id: number) => {
    const targetParentId = selectedPlan ? selectedPlan.parent_id : null;
    try {
      await dataSource.reparentPlan(id, targetParentId);
      showToast("プランを移動しました。", "success");
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, "プランの移動に失敗しました。"), "error");
    }
  };

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

  // ---- メモトレイ⇄タイムラインのドラッグ ----
  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const noteDragProps = (note: Note) => ({
    style: { cursor: "grab", touchAction: draggingNoteId !== null ? ("none" as const) : ("auto" as const) },
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      startPos.current = { x: e.clientX, y: e.clientY };
      clearLongPress();
      const pointerId = e.pointerId;
      const target = e.currentTarget;
      longPressTimer.current = window.setTimeout(() => {
        setDraggingNoteId(note.id);
        target.setPointerCapture(pointerId);
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (startPos.current && draggingNoteId === null) {
        const dx = Math.abs(e.clientX - startPos.current.x);
        const dy = Math.abs(e.clientY - startPos.current.y);
        if (dx > 8 || dy > 8) clearLongPress();
        return;
      }
      if (draggingNoteId === null) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const zone = el?.closest("[data-drop-zone]") as HTMLElement | null;
      setDropZone((zone?.dataset.dropZone as "timeline" | "tray" | undefined) ?? null);
    },
    onPointerUp: () => {
      clearLongPress();
      if (draggingNoteId !== null && dropZone && selectedPlanId !== null) {
        const draggedNote = notes.find((n) => n.id === draggingNoteId);
        if (draggedNote) {
          const alreadyLinked = draggedNote.links.includes(selectedPlanId);
          if (dropZone === "timeline" && !alreadyLinked) {
            handleLinkNote(draggedNote, selectedPlanId);
          } else if (dropZone === "tray" && alreadyLinked) {
            handleUnlinkNote(draggedNote, selectedPlanId);
          }
        }
      }
      setDraggingNoteId(null);
      setDropZone(null);
      startPos.current = null;
    },
    onPointerCancel: () => {
      clearLongPress();
      setDraggingNoteId(null);
      setDropZone(null);
      startPos.current = null;
    },
  });

  const libraryNotes = useMemo(() => {
    if (libraryTypeFilter === "all") return notes;
    return notes.filter((n) => n.type === libraryTypeFilter);
  }, [notes, libraryTypeFilter]);

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

            {routineTodoNotes.length === 0 ? (
              <Stack spacing={1} alignItems="center" sx={{ py: 6 }}>
                <SentimentSatisfiedAltIcon sx={{ fontSize: 48, color: "success.main" }} />
                <Typography color="text.secondary">今、対応することはありません。</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                  メモの編集画面で「繰り返し」を設定すると、ここに表示されます。
                </Typography>
              </Stack>
            ) : (
              routineGroups.map(([days, groupNotes]) => (
                <Stack key={days} spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {days}日ごと
                  </Typography>
                  {groupNotes.map((note) => {
                    const checked = justChecked.has(note.id);
                    return (
                      <Paper
                        key={note.id}
                        variant="outlined"
                        sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Checkbox checked={checked} onChange={() => handleRoutineCheck(note)} />
                        <Stack sx={{ flex: 1, minWidth: 0 }}>
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
                      </Paper>
                    );
                  })}
                </Stack>
              ))
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
                目標一覧
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
            <PlanList
              plans={childrenOf(null)}
              onSelect={(plan) => setSelectedPlanId(plan.id)}
              onEdit={(plan) => {
                setEditingPlan(plan);
                setPlanDialogOpen(true);
              }}
              onDelete={(plan) => setDeleteTarget({ kind: "plan", plan })}
              onReorder={handleReorderPlans}
              onReparent={handleReparentPlan}
            />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Breadcrumbs>
              <Link component="button" underline="hover" onClick={() => setSelectedPlanId(null)}>
                目標一覧
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
            <Box sx={{ maxWidth: 320 }}>
              <ProgressBadge value={selectedPlan.progress} />
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
            <PlanList
              plans={childrenOf(selectedPlan.id)}
              onSelect={(plan) => setSelectedPlanId(plan.id)}
              onEdit={(plan) => {
                setEditingPlan(plan);
                setPlanDialogOpen(true);
              }}
              onDelete={(plan) => setDeleteTarget({ kind: "plan", plan })}
              onReorder={handleReorderPlans}
              onReparent={handleReparentPlan}
              onPromoteToRoot={handlePromotePlan}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                リンク済みメモ（タイムライン）
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
            <Box
              ref={timelineRef}
              data-drop-zone="timeline"
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                minHeight: 80,
                p: 1,
                borderRadius: 2,
                border: draggingNoteId !== null ? "2px dashed" : "none",
                borderColor: dropZone === "timeline" ? "primary.main" : "divider",
                bgcolor: dropZone === "timeline" ? "action.hover" : "transparent",
              }}
            >
              {notesLinkedTo(selectedPlan.id).length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  まだリンクされたメモがありません。下のトレイからドラッグ、または「+」から新規作成できます。
                </Typography>
              ) : (
                notesLinkedTo(selectedPlan.id).map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    planOptions={planOptions}
                    dragProps={noteDragProps(note)}
                    dragging={draggingNoteId === note.id}
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
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              メモトレイ（すべてのメモ・指で持ち上げてタイムラインへ）
            </Typography>
            <Box
              ref={trayRef}
              data-drop-zone="tray"
              sx={{
                display: "flex",
                gap: 1.5,
                overflowX: "auto",
                p: 1,
                borderRadius: 2,
                border: draggingNoteId !== null ? "2px dashed" : "1px solid",
                borderColor: dropZone === "tray" ? "primary.main" : "divider",
                bgcolor: dropZone === "tray" ? "action.hover" : "transparent",
              }}
            >
              {trayNotes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  他に紐付けられるメモはありません。
                </Typography>
              ) : (
                trayNotes.map((note) => (
                  <Box key={note.id} sx={{ minWidth: 220, maxWidth: 220 }}>
                    <Paper
                      variant="outlined"
                      {...noteDragProps(note)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        opacity: draggingNoteId === note.id ? 0.4 : 1,
                        cursor: "grab",
                      }}
                    >
                      <Chip label={note.type === "learning" ? "学習用" : note.type === "task" ? "タスク用" : "通常"} size="small" sx={{ mb: 0.5 }} />
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {note.title}
                      </Typography>
                    </Paper>
                  </Box>
                ))
              )}
            </Box>
          </Stack>
        )}
      </Container>

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
        onClose={() => setPlanDialogOpen(false)}
        onSubmit={handleSavePlan}
        parentId={createParentId}
        parentTitle={selectedPlan?.title}
        initialPlan={editingPlan}
      />

      <NoteFormDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        onSubmit={handleSaveNote}
        initialNote={editingNote}
        fixedPlanId={noteFixedPlanId}
        categories={categories}
        tagOptions={tagOptions}
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
