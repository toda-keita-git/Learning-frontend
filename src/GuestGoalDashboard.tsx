import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import GitHubIcon from "@mui/icons-material/GitHub";
import PlanDashboard from "./PlanDashboard";
import { guestPlanDataSource, clearGuestPlanData } from "./component/guestPlanStorage";

// GitHubログイン不要のお試しモード。バックエンドへは一切書き込まず、
// この端末のlocalStorageだけでプラン・メモを完結させる
export default function GuestGoalDashboard() {
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleReset = () => {
    clearGuestPlanData();
    setResetConfirmOpen(false);
    window.location.reload();
  };

  const banner = !bannerDismissed && (
    <Alert
      severity="info"
      icon={false}
      sx={{ borderRadius: 0 }}
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            color="inherit"
            size="small"
            startIcon={<GitHubIcon fontSize="small" />}
            onClick={() => navigate("/LearningContent")}
          >
            GitHubでログイン
          </Button>
          <IconButton color="inherit" size="small" onClick={() => setBannerDismissed(true)} aria-label="閉じる">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      }
    >
      ゲストモードで試しています。データはこの端末だけに保存され、GitHubでログインしても自動では引き継がれません。
    </Alert>
  );

  return (
    <>
      <PlanDashboard
        dataSource={guestPlanDataSource}
        userId={null}
        accountLabel="ゲスト"
        onLogout={() => setResetConfirmOpen(true)}
        topBanner={banner}
      />

      <Dialog open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ゲストデータを消去しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この端末に保存されているプラン・メモがすべて削除されます。この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfirmOpen(false)}>キャンセル</Button>
          <Button onClick={handleReset} color="error" variant="contained">
            消去する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
