import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import { useToast } from "../ToastContext";
import { registerPlanInterestApi, checkPlanInterestApi } from "./Api";

interface PlanComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  githubLogin: string | null;
}

const FREE_FEATURES = [
  "学習記録の登録・編集・削除（無制限）",
  "カテゴリ・タグでの整理と検索",
  "GitHub連携（1リポジトリ）",
  "オフライン閲覧・オフライン中の変更の自動同期",
  "今日の復習（スキマ時間モード）",
  "学習分析ダッシュボード（基本）",
];

const PRO_FEATURES = [
  "学習分析のCSV/PDFエクスポート",
  "複数GitHubリポジトリの連携",
  "関連メモサジェストの精度向上",
  "広告非表示",
  "優先サポート",
];

/** 実際の課金は行わない、プラン比較の案内のみのダイアログ */
export default function PlanComparisonDialog({
  open,
  onClose,
  userId,
  githubLogin,
}: PlanComparisonDialogProps) {
  const { showToast } = useToast();
  const [requested, setRequested] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ダイアログを開くたびに、このユーザーが既に希望登録済みかを確認する
  // （リロードしても「希望済み」の状態を維持するため）
  useEffect(() => {
    if (open && userId) {
      checkPlanInterestApi()
        .then(setRequested)
        .catch((err) => console.error("希望登録状況の確認に失敗しました:", err));
    }
  }, [open, userId]);

  const handleConfirmInterest = async () => {
    if (!userId || !githubLogin) {
      showToast("ログイン情報が確認できませんでした。再度お試しください。", "error");
      setConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      await registerPlanInterestApi();
      setRequested(true);
      showToast("通知希望を受け付けました。公開時にお知らせします。", "success");
    } catch (err) {
      console.error("通知希望の登録に失敗しました:", err);
      showToast("通知希望の登録に失敗しました。時間をおいてお試しください。", "error");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <WorkspacePremiumOutlinedIcon color="primary" /> プラン
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Paper variant="outlined" sx={{ flex: 1, p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              フリー
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              ¥0
            </Typography>
            <Stack spacing={1}>
              {FREE_FEATURES.map((f) => (
                <Box key={f} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <CheckCircleOutlineIcon fontSize="small" color="success" sx={{ mt: "2px" }} />
                  <Typography variant="body2">{f}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 2.5,
              borderColor: "primary.main",
              borderWidth: 2,
              position: "relative",
            }}
          >
            <Chip
              label="近日公開"
              size="small"
              color="primary"
              sx={{ position: "absolute", top: 12, right: 12 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Pro
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              準備中
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
              フリープランの内容にすべて含まれます
            </Typography>
            <Stack spacing={1}>
              {PRO_FEATURES.map((f) => (
                <Box key={f} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <CheckCircleOutlineIcon
                    fontSize="small"
                    sx={{ mt: "2px", color: "primary.main" }}
                  />
                  <Typography variant="body2">{f}</Typography>
                </Box>
              ))}
            </Stack>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mt: 2 }}
              disabled={requested}
              onClick={() => setConfirmOpen(true)}
            >
              {requested ? "希望済み" : "近日公開・通知を希望する"}
            </Button>
          </Paper>
        </Stack>
      </DialogContent>

      {/* 誤クリック防止の確認モーダル */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>通知を希望しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Proプランが公開された際にお知らせします。よろしいですか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={submitting}>
            キャンセル
          </Button>
          <Button onClick={handleConfirmInterest} variant="contained" disabled={submitting}>
            {submitting ? "登録中…" : "希望する"}
          </Button>
        </DialogActions>
      </Dialog>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
