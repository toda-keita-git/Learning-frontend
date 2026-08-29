import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { guestImportApi } from "./Api";
import { readGuestDataForImport, clearGuestPlanData, dismissGuestImport } from "./guestPlanStorage";
import { useToast } from "../ToastContext";
import { errorMessage } from "./errorMessage";

interface GuestImportGateProps {
  // 取り込んだ・見送った、いずれの決着でも呼ばれる。呼び出し元はこれを受けて
  // 通常のダッシュボード表示へ進む
  onDone: () => void;
}

// ログイン直後、この端末にゲストモードの記録が残っている場合に割り込ませる確認画面。
// 「価値を体験した利用者ほど、登録時に同じ内容を作り直す必要がある」という
// 販売可否評価レポートの指摘（4.5）への対応。
//
// AuthenticatedGoalAppがPlanDashboardの代わりにこれを描画し、決着が付いたら
// 通常表示へ進む（PlanDashboard側の変更を避けるため、ゲート方式にしている）。
export default function GuestImportGate({ onDone }: GuestImportGateProps) {
  const { showToast } = useToast();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表示中に増減しても混乱するだけなので、マウント時点の内容を1回だけ読む
  const { plans, notes } = useMemo(() => readGuestDataForImport(), []);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const result = await guestImportApi(plans, notes);
      // 取り込み後もゲストデータを残すと、次回ログイン時にまた「取り込みますか？」が
      // 出て二重に取り込まれてしまうため、成功した時点でこの端末の分は消す
      clearGuestPlanData();
      const skippedNote =
        result.skipped_notes > 0
          ? `（フリープランの登録上限のため、メモ${result.skipped_notes}件は取り込めませんでした）`
          : "";
      showToast(
        `ゲストデータを取り込みました（プラン${result.imported_plans}件・メモ${result.imported_notes}件）${skippedNote}`,
        "success",
        { durationMs: 6000 }
      );
      onDone();
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "取り込みに失敗しました。時間をおいてもう一度お試しください。"));
    } finally {
      setImporting(false);
    }
  };

  const handleDismiss = () => {
    // データ自体は消さず、確認だけ次回から省略する
    dismissGuestImport();
    onDone();
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Paper sx={{ maxWidth: 440, width: "100%", p: { xs: 4, sm: 5 }, borderRadius: 4 }}>
        <CloudUploadOutlinedIcon sx={{ fontSize: 48, color: "primary.main", mb: 2, display: "block", mx: "auto" }} />
        <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 800 }}>
          ゲストモードのデータがあります
        </Typography>
        <Typography sx={{ mb: 3, color: "text.secondary", textAlign: "center" }}>
          この端末にお試し用の記録が残っています。このアカウントに取り込みますか？
        </Typography>

        <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 3 }}>
          <Stack alignItems="center" spacing={0.5}>
            <FlagOutlinedIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {plans.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              プラン
            </Typography>
          </Stack>
          <Stack alignItems="center" spacing={0.5}>
            <DescriptionOutlinedIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {notes.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              メモ
            </Typography>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {importing ? "取り込み中…" : "取り込む"}
          </Button>
          <Button variant="text" fullWidth onClick={handleDismiss} disabled={importing}>
            今は取り込まない
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
          取り込むと、この端末のお試しデータはこのアカウントの記録として置き換わります。
        </Typography>
      </Paper>
    </Box>
  );
}
