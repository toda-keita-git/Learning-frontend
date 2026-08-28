import { useContext, useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { AuthContext } from "../Context";
import { meApi } from "./Api";
import type { AccountInfo } from "./Api";
import { errorMessage } from "./errorMessage";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface AccountInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

// フッター「その他」→「アカウント情報」。今ログインしているアカウントの情報と、
// GitHub / Google の連携状況をまとめて見る場所。
//
// 連携（旧「アカウント連携」）もここに統合している。ヘッダーにアイコンで置いていたが、
// 何のアイコンか分かりにくく、アカウントに関する操作が複数の場所に散っていたため
export default function AccountInfoDialog({ open, onClose }: AccountInfoDialogProps) {
  const { linkGithub, linkGoogle, authProvider } = useContext(AuthContext);
  const fullScreenDialog = useFullScreenDialog();

  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    meApi()
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "アカウント情報の取得に失敗しました。"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const row = (
    kind: "github" | "google",
    linked: boolean,
    detail: string | null,
    onLink: () => void
  ) => (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
    >
      {kind === "github" ? <GitHubIcon /> : <GoogleIcon />}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {kind === "github" ? "GitHub" : "Google"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
          {linked ? detail || "連携済み" : kind === "github" ? "リポジトリに添付を保存できます" : "ドライブに添付を保存できます"}
        </Typography>
      </Box>
      {linked ? (
        <Chip
          icon={<CheckCircleIcon />}
          label="連携済み"
          size="small"
          color="success"
          variant="outlined"
          sx={{ flexShrink: 0 }}
        />
      ) : (
        <Button size="small" variant="contained" onClick={onLink} sx={{ flexShrink: 0 }}>
          連携する
        </Button>
      )}
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle>アカウント情報</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : info ? (
          <Stack spacing={2}>
            {/* まず「今どのアカウントで入っているか」を出す。連携状況だけだと
                ログインに使ったのがどちらなのかが分からないため */}
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography variant="caption" color="text.secondary">
                ログイン中のアカウント
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: "break-all" }}>
                {info.auth_provider === "google"
                  ? info.email || "Googleアカウント"
                  : info.github_login
                    ? `@${info.github_login}`
                    : "GitHubアカウント"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(info.auth_provider ?? authProvider) === "google" ? "Googleでログイン中" : "GitHubでログイン中"}
                ・ユーザーID {info.user_id}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              1つのアカウントにGitHubとGoogleの両方を連携できます。連携しても新しいアカウントは作られず、
              今の目標・プラン・メモはそのまま残ります。
            </Typography>

            {row("github", info.has_github, info.github_login ? `@${info.github_login}` : null, linkGithub)}
            {row("google", info.has_google, info.email, linkGoogle)}

            {info.has_github && info.has_google ? (
              <Alert severity="success">
                両方連携済みです。添付ファイルはGitHubリポジトリ・Googleドライブのどちらにも保存でき、
                メモ上ではどちらに保存されているかがアイコンとラベルで表示されます。
              </Alert>
            ) : (
              <Alert severity="info">
                連携すると、添付ファイルの保存先をもう一方でも選べるようになります。
                連携時はもう一方のサービスのログイン画面が開きます。
              </Alert>
            )}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
