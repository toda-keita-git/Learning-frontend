import { useContext, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
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
import AddIcon from "@mui/icons-material/Add";
import GitHubIcon from "@mui/icons-material/GitHub";
import LogoutIcon from "@mui/icons-material/Logout";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import Badge from "@mui/material/Badge";

import { AuthContext } from "./Context";
import { useToast } from "./ToastContext";
import { ColorModeContext } from "./ColorModeContext";
import ReviewFlashcards from "./component/ReviewFlashcards";
import type { FlashItem } from "./component/ReviewFlashcards";
import { isDue, reviewCard } from "./component/srs";
import StreakDialog from "./component/StreakDialog";
import { calculateStreakStats } from "./component/streakStats";
import RelatedGraphDialog from "./component/RelatedGraphDialog";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import {
  goalsApi,
  createGoalApi,
  updateGoalApi,
  deleteGoalApi,
  actionPlansApi,
  createActionPlanApi,
  updateActionPlanApi,
  deleteActionPlanApi,
  reorderActionPlansApi,
  notesApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
  attachNoteApi,
  toggleNoteTodoApi,
  CategoriesApi,
  TagsApi,
} from "./component/Api";
import type { Goal, ActionPlan, Note, NoteInput, GoalInput, ActionPlanInput, CategoryOption } from "./component/GoalTypes";
import ProgressBadge from "./component/ProgressBadge";
import GoalFormDialog from "./component/GoalFormDialog";
import ActionPlanFormDialog from "./component/ActionPlanFormDialog";
import ActionPlanList from "./component/ActionPlanList";
import NoteFormDialog from "./component/NoteFormDialog";
import type { ActionPlanOption } from "./component/NoteFormDialog";
import NoteCard from "./component/NoteCard";
import AttachNoteDialog from "./component/AttachNoteDialog";

type TopTab = "goals" | "unattached";

type DeleteTarget =
  | { kind: "goal"; goal: Goal }
  | { kind: "actionPlan"; actionPlan: ActionPlan }
  | { kind: "note"; note: Note };

export default function GoalDashboard() {
  const { isAuthenticated, isAuthenticating, login, logout, githubLogin, userId } = useContext(AuthContext);
  const { showToast } = useToast();
  const { mode, toggle } = useContext(ColorModeContext);

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [topTab, setTopTab] = useState<TopTab>("goals");
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [selectedActionPlanId, setSelectedActionPlanId] = useState<number | null>(null);

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [actionPlanDialogOpen, setActionPlanDialogOpen] = useState(false);
  const [editingActionPlan, setEditingActionPlan] = useState<ActionPlan | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [attachTargetNote, setAttachTargetNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [streakDialogOpen, setStreakDialogOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [goalsData, plansData, notesData, categoriesData, tagsData] = await Promise.all([
        goalsApi(),
        actionPlansApi(),
        notesApi(),
        CategoriesApi(),
        TagsApi(),
      ]);
      setGoals(goalsData ?? []);
      setActionPlans(plansData ?? []);
      setNotes(notesData ?? []);
      setCategories(categoriesData ?? []);
      setTagOptions(((tagsData ?? []) as { name: string }[]).map((t) => t.name));
    } catch (err) {
      console.error(err);
      showToast("データの取得に失敗しました。時間をおいて再度お試しください。", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const goalTitleById = useMemo(() => {
    const map = new Map<number, string>();
    goals.forEach((g) => map.set(g.id, g.title));
    return map;
  }, [goals]);

  const actionPlanOptions: ActionPlanOption[] = useMemo(
    () =>
      actionPlans
        .slice()
        .sort((a, b) => a.goal_id - b.goal_id || a.priority - b.priority)
        .map((p) => ({ id: p.id, label: `${goalTitleById.get(p.goal_id) ?? "?"} / ${p.title}` })),
    [actionPlans, goalTitleById]
  );

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;
  const selectedActionPlan = actionPlans.find((p) => p.id === selectedActionPlanId) ?? null;

  const actionPlansForSelectedGoal = useMemo(
    () =>
      actionPlans
        .filter((p) => p.goal_id === selectedGoalId)
        .sort((a, b) => a.priority - b.priority),
    [actionPlans, selectedGoalId]
  );

  const notesForSelectedActionPlan = useMemo(
    () => notes.filter((n) => n.action_plan_id === selectedActionPlanId),
    [notes, selectedActionPlanId]
  );

  // アクションプラン単位の継続記録（ストリーク）
  const actionPlanStreak = useMemo(
    () => calculateStreakStats(notesForSelectedActionPlan.map((n) => n.created_at)),
    [notesForSelectedActionPlan]
  );

  const unattachedNotes = useMemo(() => notes.filter((n) => n.action_plan_id === null), [notes]);

  // ---- SRS（学習用メモの間隔反復） ----
  const learningNotes = useMemo(() => notes.filter((n) => n.type === "learning"), [notes]);
  const dueLearningNotes = useMemo(
    () => learningNotes.filter((n) => isDue(userId, n.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [learningNotes, userId, reviewOpen]
  );
  const flashItems: FlashItem[] = useMemo(
    () =>
      dueLearningNotes.map((n) => ({
        id: n.id,
        title: n.title,
        explanatory_text: n.body ?? "",
        understanding_level: n.mastery,
        category_name: categories.find((c) => c.id === n.category_id)?.name ?? "",
        tags: n.tags,
        reference_url: null,
      })),
    [dueLearningNotes, categories]
  );

  // 関連メモグラフ（タグ・カテゴリー・タイトルの共通語をもとに、メモ同士のつながりを可視化）
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
    if (note.action_plan_id === null) {
      setTopTab("unattached");
      return;
    }
    const plan = actionPlans.find((p) => p.id === note.action_plan_id);
    if (!plan) return;
    setTopTab("goals");
    setSelectedGoalId(plan.goal_id);
    setSelectedActionPlanId(plan.id);
  };

  const noteToInput = (note: Note): NoteInput => ({
    action_plan_id: note.action_plan_id,
    type: note.type,
    title: note.title,
    body: note.body,
    mastery: note.mastery,
    progress: note.progress,
    category_id: note.category_id,
    todo_items: note.todo_items,
    tags: note.tags,
    github_path: note.github_path,
    commit_sha: note.commit_sha,
    repo_name: note.repo_name,
  });

  const handleRateNote = async (item: FlashItem, newLevel: number, understood: boolean) => {
    const note = notes.find((n) => n.id === item.id);
    if (!note) return;
    reviewCard(userId, note.id, understood);
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, mastery: newLevel } : n)));
    try {
      await updateNoteApi(note.id, { ...noteToInput(note), mastery: newLevel });
    } catch (err) {
      console.error(err);
      showToast("理解度の更新に失敗しました。", "error");
    }
  };

  // ---- 目標 ----
  const handleSaveGoal = async (data: GoalInput) => {
    if (editingGoal) {
      await updateGoalApi(editingGoal.id, data);
      showToast("目標を更新しました。", "success");
    } else {
      await createGoalApi(data);
      showToast("目標を作成しました。", "success");
    }
    await fetchAll();
  };

  // ---- アクションプラン ----
  const handleSaveActionPlan = async (data: ActionPlanInput) => {
    if (editingActionPlan) {
      await updateActionPlanApi(editingActionPlan.id, data);
      showToast("アクションプランを更新しました。", "success");
    } else {
      await createActionPlanApi(data);
      showToast("アクションプランを作成しました。", "success");
    }
    await fetchAll();
  };

  const handleReorderActionPlans = async (orderedIds: number[]) => {
    // 即座に画面上の順序を反映してから、確定をバックエンドへ送る（体感の反応速度を優先）
    setActionPlans((prev) => {
      const priorityById = new Map(orderedIds.map((id, index) => [id, index]));
      return prev
        .map((p) => (priorityById.has(p.id) ? { ...p, priority: priorityById.get(p.id)! } : p))
        .sort((a, b) => a.priority - b.priority);
    });
    try {
      await reorderActionPlansApi(orderedIds.map((id, index) => ({ id, priority: index })));
    } catch (err) {
      console.error(err);
      showToast("並べ替えの保存に失敗しました。", "error");
      fetchAll();
    }
  };

  // ---- メモ ----
  const handleSaveNote = async (data: NoteInput) => {
    if (editingNote) {
      await updateNoteApi(editingNote.id, data);
      showToast("メモを更新しました。", "success");
    } else {
      await createNoteApi(data);
      showToast(data.action_plan_id ? "メモを作成しました。" : "メモを未紐付けで作成しました。後から紐付けられます。", "success");
    }
    await fetchAll();
  };

  const handleToggleTodo = async (todoItemId: number, checked: boolean) => {
    setNotes((prev) =>
      prev.map((n) => ({
        ...n,
        todo_items: n.todo_items.map((t) => (t.id === todoItemId ? { ...t, checked } : t)),
      }))
    );
    try {
      await toggleNoteTodoApi(todoItemId, checked);
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast("todoの更新に失敗しました。", "error");
      fetchAll();
    }
  };

  const handleAttachNote = async (actionPlanId: number) => {
    if (!attachTargetNote) return;
    await attachNoteApi(attachTargetNote.id, actionPlanId);
    showToast("アクションプランに紐付けました。", "success");
    await fetchAll();
  };

  // ---- 削除 ----
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "goal") {
        await deleteGoalApi(deleteTarget.goal.id);
        if (selectedGoalId === deleteTarget.goal.id) setSelectedGoalId(null);
      } else if (deleteTarget.kind === "actionPlan") {
        await deleteActionPlanApi(deleteTarget.actionPlan.id);
        if (selectedActionPlanId === deleteTarget.actionPlan.id) setSelectedActionPlanId(null);
      } else {
        await deleteNoteApi(deleteTarget.note.id);
      }
      showToast("削除しました。", "success");
      await fetchAll();
    } catch (err) {
      console.error(err);
      showToast("削除に失敗しました。", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        <Paper sx={{ maxWidth: 420, width: "100%", textAlign: "center", p: { xs: 4, sm: 6 }, borderRadius: 4 }}>
          {isAuthenticating ? (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                接続中です…
              </Typography>
            </>
          ) : (
            <>
              <FlagOutlinedIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>
                目標達成支援アプリへようこそ
              </Typography>
              <Typography sx={{ mb: 3, color: "text.secondary" }}>
                目標・アクションプラン・メモを記録するには、
                <br />
                GitHubアカウントでのログインが必要です。
              </Typography>
              <Button variant="contained" size="large" fullWidth startIcon={<GitHubIcon />} onClick={login}>
                GitHubでログイン
              </Button>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar>
          <FlagOutlinedIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
            目標達成支援
          </Typography>
          {githubLogin && (
            <Typography variant="body2" sx={{ color: "text.secondary", mr: 2, display: { xs: "none", sm: "block" } }}>
              {githubLogin}
            </Typography>
          )}
          {learningNotes.length > 0 && (
            <IconButton onClick={() => setReviewOpen(true)} aria-label="今日の復習" sx={{ mr: 1 }}>
              <Badge badgeContent={dueLearningNotes.length} color="error">
                <MenuBookOutlinedIcon />
              </Badge>
            </IconButton>
          )}
          {notes.length > 1 && (
            <IconButton onClick={() => setGraphOpen(true)} aria-label="関連メモグラフ" sx={{ mr: 1 }}>
              <HubOutlinedIcon />
            </IconButton>
          )}
          <IconButton onClick={toggle} aria-label="テーマ切り替え" sx={{ mr: 1 }}>
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <IconButton onClick={logout} aria-label="ログアウト">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
        <Tabs
          value={topTab}
          onChange={(_, v) => {
            setTopTab(v);
            setSelectedGoalId(null);
            setSelectedActionPlanId(null);
          }}
          sx={{ px: 2 }}
        >
          <Tab value="goals" label="目標" />
          <Tab
            value="unattached"
            label={`未紐付けメモ${unattachedNotes.length > 0 ? ` (${unattachedNotes.length})` : ""}`}
          />
        </Tabs>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : topTab === "unattached" ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              アクションプランを選ばずに作成されたメモです。紐付け先を選ぶと、そのアクションプランの振り返りタイムラインに移動します。
            </Typography>
            {unattachedNotes.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                未紐付けのメモはありません。
              </Typography>
            ) : (
              unattachedNotes.map((note) => (
                <Stack key={note.id} spacing={1}>
                  <NoteCard
                    note={note}
                    onEdit={() => {
                      setEditingNote(note);
                      setNoteDialogOpen(true);
                    }}
                    onDelete={() => setDeleteTarget({ kind: "note", note })}
                    onToggleTodo={handleToggleTodo}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                    onClick={() => setAttachTargetNote(note)}
                  >
                    アクションプランに紐付ける
                  </Button>
                </Stack>
              ))
            )}
          </Stack>
        ) : !selectedGoal ? (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                目標一覧
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setEditingGoal(null);
                  setGoalDialogOpen(true);
                }}
              >
                新しい目標
              </Button>
            </Stack>

            {goals.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
                まだ目標がありません。「新しい目標」から最初の目標を作成しましょう。
              </Typography>
            ) : (
              goals.map((goal) => (
                <Paper
                  key={goal.id}
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 2, cursor: "pointer" }}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                          {goal.title}
                        </Typography>
                        <Chip
                          label={goal.status === "achieved" ? "達成" : goal.status === "suspended" ? "中断" : "進行中"}
                          size="small"
                          color={goal.status === "achieved" ? "success" : "default"}
                        />
                      </Stack>
                      {goal.description && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {goal.description}
                        </Typography>
                      )}
                      <Box sx={{ maxWidth: 280, mt: 1 }}>
                        <ProgressBadge value={goal.progress} />
                      </Box>
                    </Stack>
                    <Stack direction="row">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGoal(goal);
                          setGoalDialogOpen(true);
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ kind: "goal", goal });
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        ) : !selectedActionPlan ? (
          <Stack spacing={2}>
            <Breadcrumbs>
              <Link component="button" underline="hover" onClick={() => setSelectedGoalId(null)}>
                目標一覧
              </Link>
              <Typography color="text.primary">{selectedGoal.title}</Typography>
            </Breadcrumbs>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {selectedGoal.title}
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setEditingActionPlan(null);
                  setActionPlanDialogOpen(true);
                }}
              >
                新しいアクションプラン
              </Button>
            </Stack>
            <Box sx={{ maxWidth: 320 }}>
              <ProgressBadge value={selectedGoal.progress} />
            </Box>
            <ActionPlanList
              actionPlans={actionPlansForSelectedGoal}
              onSelect={(plan) => setSelectedActionPlanId(plan.id)}
              onEdit={(plan) => {
                setEditingActionPlan(plan);
                setActionPlanDialogOpen(true);
              }}
              onDelete={(plan) => setDeleteTarget({ kind: "actionPlan", actionPlan: plan })}
              onReorder={handleReorderActionPlans}
            />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Breadcrumbs>
              <Link component="button" underline="hover" onClick={() => setSelectedGoalId(null)}>
                目標一覧
              </Link>
              <Link component="button" underline="hover" onClick={() => setSelectedActionPlanId(null)}>
                {selectedGoal.title}
              </Link>
              <Typography color="text.primary">{selectedActionPlan.title}</Typography>
            </Breadcrumbs>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {selectedActionPlan.title}
              </Typography>
              <Stack direction="row" spacing={1}>
                {notesForSelectedActionPlan.length > 0 && (
                  <Button
                    startIcon={<LocalFireDepartmentIcon sx={{ color: "#f97316" }} />}
                    variant="outlined"
                    onClick={() => setStreakDialogOpen(true)}
                  >
                    継続 {actionPlanStreak.current}日
                  </Button>
                )}
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={() => {
                    setEditingNote(null);
                    setNoteDialogOpen(true);
                  }}
                >
                  新しいメモ
                </Button>
              </Stack>
            </Stack>
            <Box sx={{ maxWidth: 320 }}>
              <ProgressBadge value={selectedActionPlan.progress} />
            </Box>

            {notesForSelectedActionPlan.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
                まだメモがありません。「新しいメモ」から振り返りを記録しましょう。
              </Typography>
            ) : (
              notesForSelectedActionPlan.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => {
                    setEditingNote(note);
                    setNoteDialogOpen(true);
                  }}
                  onDelete={() => setDeleteTarget({ kind: "note", note })}
                  onToggleTodo={handleToggleTodo}
                />
              ))
            )}
          </Stack>
        )}
      </Container>

      <GoalFormDialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        onSubmit={handleSaveGoal}
        initialGoal={editingGoal}
      />

      {selectedGoal && (
        <ActionPlanFormDialog
          open={actionPlanDialogOpen}
          onClose={() => setActionPlanDialogOpen(false)}
          onSubmit={handleSaveActionPlan}
          goalId={selectedGoal.id}
          initialActionPlan={editingActionPlan}
        />
      )}

      <NoteFormDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        onSubmit={handleSaveNote}
        initialNote={editingNote}
        fixedActionPlanId={topTab === "goals" && selectedActionPlan ? selectedActionPlan.id : undefined}
        actionPlanOptions={actionPlanOptions}
        categories={categories}
        tagOptions={tagOptions}
      />

      <AttachNoteDialog
        open={!!attachTargetNote}
        onClose={() => setAttachTargetNote(null)}
        onConfirm={handleAttachNote}
        actionPlanOptions={actionPlanOptions}
      />

      <ReviewFlashcards
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        items={flashItems}
        onRate={handleRateNote}
      />

      <StreakDialog
        open={streakDialogOpen}
        onClose={() => setStreakDialogOpen(false)}
        dates={notesForSelectedActionPlan.map((n) => n.created_at)}
      />

      <RelatedGraphDialog
        open={graphOpen}
        onClose={() => setGraphOpen(false)}
        items={graphItems}
        onOpenItem={handleOpenGraphItem}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget?.kind === "goal" &&
              `目標「${deleteTarget.goal.title}」を削除します。配下のアクションプラン・メモの表示にも影響します。`}
            {deleteTarget?.kind === "actionPlan" &&
              `アクションプラン「${deleteTarget.actionPlan.title}」を削除します。紐づくメモは未紐付けに戻ります。`}
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
