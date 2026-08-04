import { useContext } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import GitHubIcon from "@mui/icons-material/GitHub";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { AuthContext } from "./Context";
import PlanDashboard from "./PlanDashboard";
import { apiPlanDataSource } from "./component/planDataSource";

// GitHubログインを要求するゲート。ログイン済みならバックエンドAPIを使う
// PlanDashboardを、未ログインならログイン画面を表示する
export default function AuthenticatedGoalApp() {
  const { isAuthenticated, isAuthenticating, login, logout, githubLogin, userId } = useContext(AuthContext);

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

  return <PlanDashboard dataSource={apiPlanDataSource} userId={userId} accountLabel={githubLogin} onLogout={logout} />;
}
