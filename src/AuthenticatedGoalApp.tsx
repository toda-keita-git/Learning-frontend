import { useContext, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { AuthContext } from "./Context";
import PlanDashboard from "./PlanDashboard";
import { apiPlanDataSource } from "./component/planDataSource";
import GuestImportGate from "./component/GuestImportGate";
import { hasGuestData, isGuestImportDismissed } from "./component/guestPlanStorage";

// GitHub・Googleいずれかのログインを要求するゲート。ログイン済みならバックエンドAPIを使う
// PlanDashboardを、未ログインならログイン画面（初回ログイン時にどちらを使うか選ぶ場所）を表示する
export default function AuthenticatedGoalApp() {
  const { isAuthenticated, isAuthenticating, login, loginWithGoogle, logout, githubLogin, googleEmail, authProvider, userId } =
    useContext(AuthContext);

  // ログイン直後、この端末にゲストモードの記録が残っていれば取り込みを確認する。
  // ゲストデータはOAuthの間に増減しないため、マウント時点の1回だけ判定すればよい
  const [showGuestImportGate, setShowGuestImportGate] = useState(
    () => hasGuestData() && !isGuestImportDismissed()
  );

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
                GitHubまたはGoogleアカウントでのログインが必要です。
              </Typography>
              <Stack spacing={1.5}>
                <Button variant="contained" size="large" fullWidth startIcon={<GitHubIcon />} onClick={login}>
                  GitHubでログイン
                </Button>
                <Button variant="outlined" size="large" fullWidth startIcon={<GoogleIcon />} onClick={loginWithGoogle}>
                  Googleでログイン
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  const accountLabel = authProvider === "google" ? googleEmail : githubLogin;

  if (showGuestImportGate) {
    return <GuestImportGate onDone={() => setShowGuestImportGate(false)} />;
  }

  return <PlanDashboard dataSource={apiPlanDataSource} userId={userId} accountLabel={accountLabel} onLogout={logout} />;
}
