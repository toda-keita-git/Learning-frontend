import { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import ButtonBase from "@mui/material/ButtonBase";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import StarIcon from "@mui/icons-material/Star";
import type { Plan, Note } from "./PlanTypes";
import { PLAN_STATUS_LABEL, NOTE_TYPE_LABEL } from "./PlanTypes";
import { isRoutineDue } from "./routine";
import { useFullScreenDialog } from "./useFullScreenDialog";
import DeadlineChip from "./DeadlineChip";

interface TodayNextDialogProps {
  open: boolean;
  onClose: () => void;
  plans: Plan[];
  notes: Note[];
  userId: number | null;
  onOpenPlan: (planId: number) => void;
}

// 「次にやること」として1つの目標につき出す件数の上限。
// 全部並べると結局ツリーを見るのと変わらず、何から手を付けるか分からなくなるため絞る
const MAX_NEXT_PER_GOAL = 3;

// 目標ごとに「今日やること」と「次にやること」をまとめて見せる画面。
//
// 今日やること: その目標の配下にリンクされたメモのうち、繰り返し（習慣）の期日が来ているもの。
// 次にやること: その目標の配下でまだ完了していないアクションプランを、期限が近い順で先頭から。
//
// プランボードは「全体の構造」を見るためのものなので、そこからは
// 「今どれに手を付ければよいか」が読み取りにくい。その一点だけを抜き出して見せる
export default function TodayNextDialog({
  open,
  onClose,
  plans,
  notes,
  userId,
  onOpenPlan,
}: TodayNextDialogProps) {
  const fullScreenDialog = useFullScreenDialog();

  const goalSections = useMemo(() => {
    const childrenByParent = new Map<number | null, Plan[]>();
    for (const plan of plans) {
      const list = childrenByParent.get(plan.parent_id) ?? [];
      list.push(plan);
      childrenByParent.set(plan.parent_id, list);
    }
    for (const list of childrenByParent.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }

    const goals = childrenByParent.get(null) ?? [];

    return goals.map((goal) => {
      // 目標配下のプランを、ツリーの並び順（深さ優先）で列挙する。
      // この順序がそのまま「上から順に取り組む」順序になる
      const descendants: Plan[] = [];
      const walk = (parentId: number) => {
        for (const child of childrenByParent.get(parentId) ?? []) {
          descendants.push(child);
          walk(child.id);
        }
      };
      walk(goal.id);

      const planIds = new Set<number>([goal.id, ...descendants.map((p) => p.id)]);

      const todayNotes = notes.filter(
        (n) =>
          n.links.some((id) => planIds.has(id)) &&
          isRoutineDue(userId, n.id, n.review_interval_days)
      );

      // 完了・中断は「次にやること」から外す。期限未設定同士はツリーの並び順を維持する。
      // statusに加えてprogressも見ているのは、
      // バックエンド側は/plans取得のたびにprogress===100のプランをstatus="done"へ
      // 自動で追随させるが、その反映が届く前の古いデータ（オフラインキャッシュ等）では
      // 「進捗100%なのに未着手のまま」の行が一時的に残りうるための保険
      const isDone = (p: Plan) => p.status === "done" || p.status === "suspended" || p.progress === 100;
      const pendingPlans = descendants.filter((p) => !isDone(p));
      const nextPlans = [...pendingPlans]
        .sort((a, b) => {
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return a.sort_order - b.sort_order;
        })
        .slice(0, MAX_NEXT_PER_GOAL);

      return { goal, todayNotes, nextPlans, remainingCount: pendingPlans.length - nextPlans.length };
    });
  }, [plans, notes, userId]);

  const totalToday = goalSections.reduce((sum, s) => sum + s.todayNotes.length, 0);

  // 目標との紐づけに関わらず、「重要」チェックの付いたメモを画面全体の一番下にまとめて表示する
  const importantNotes = useMemo(() => notes.filter((n) => n.important), [notes]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TodayOutlinedIcon color="primary" />
        今日やること・次にやること
      </DialogTitle>
      <DialogContent dividers>
        {goalSections.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            まだ目標がありません。プランボードから目標を作成しましょう。
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            {totalToday === 0 && (
              <Stack spacing={0.5} alignItems="center" sx={{ py: 1 }}>
                <SentimentSatisfiedAltIcon sx={{ fontSize: 40, color: "success.main" }} />
                <Typography variant="body2" color="text.secondary">
                  今日やることはありません。
                </Typography>
              </Stack>
            )}

            {goalSections.map(({ goal, todayNotes, nextPlans, remainingCount }) => (
              <Paper key={goal.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mb: 1 }}>
                  <FlagOutlinedIcon fontSize="small" color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                  <Typography variant="body1" sx={{ fontWeight: 700, wordBreak: "break-word" }}>
                    {goal.title}
                  </Typography>
                </Stack>

                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  今日やること（{todayNotes.length}）
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5, mb: 1.5 }}>
                  {todayNotes.length === 0 ? (
                    <Typography variant="body2" color="text.disabled">
                      なし
                    </Typography>
                  ) : (
                    todayNotes.map((note) => (
                      <Stack key={note.id} direction="row" spacing={0.75} alignItems="center">
                        <Box
                          sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "error.main", flexShrink: 0 }}
                        />
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                          {note.title}
                        </Typography>
                        {/* 今日やることは期日が来たメモだけを表示するため、残り日数は常に0。
                            「あと0日」ではなく「今日」とだけ示す */}
                        <Chip label="今日" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                      </Stack>
                    ))
                  )}
                </Stack>

                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  次にやること
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {nextPlans.length === 0 ? (
                    <Typography variant="body2" color="text.disabled">
                      未完了のアクションプランはありません。
                    </Typography>
                  ) : (
                    <>
                      {nextPlans.map((plan) => (
                        <ButtonBase
                          key={plan.id}
                          onClick={() => onOpenPlan(plan.id)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            width: "100%",
                            textAlign: "left",
                            justifyContent: "flex-start",
                            borderRadius: 1,
                            px: 0.5,
                            py: 0.5,
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                            {plan.title}
                          </Typography>
                          <Chip
                            label={PLAN_STATUS_LABEL[plan.status]}
                            size="small"
                            variant="outlined"
                            sx={{ flexShrink: 0 }}
                          />
                          <DeadlineChip value={plan.due_date} />
                          <ChevronRightIcon fontSize="small" color="action" sx={{ flexShrink: 0 }} />
                        </ButtonBase>
                      ))}
                      {remainingCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          ほか {remainingCount} 件
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {/* 重要なメモは特定の目標に属さず横断的なので、目標ごとの一覧とは別に
            画面全体の一番下にまとめて表示する */}
        {importantNotes.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mt: 2.5 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
              <StarIcon fontSize="small" sx={{ color: "warning.main" }} />
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                重要なメモ（{importantNotes.length}）
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              {importantNotes.map((note) => (
                <Stack key={note.id} direction="row" spacing={0.75} alignItems="center">
                  <Chip label={NOTE_TYPE_LABEL[note.type]} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                    {note.title}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
