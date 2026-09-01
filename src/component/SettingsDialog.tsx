import { useContext, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import LogoutIcon from "@mui/icons-material/Logout";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import { ColorModeContext } from "../ColorModeContext";
import { useFullScreenDialog } from "./useFullScreenDialog";
import { isStudyLogCommitEnabled, setStudyLogCommitEnabled } from "./studyLogSetting";
import {
  isNotificationSupported,
  isRemindersEnabled,
  requestAndEnableReminders,
  setRemindersEnabled,
  showTestReminder,
} from "../notifications";
import { useToast } from "../ToastContext";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  // ゲストモード（userIdがnull）ではログアウトではなく端末内データの消去になるため、
  // 同じボタンでも文言と色を変える
  isGuest: boolean;
  // GitHub連携済みのときだけ「学習ログをコミットする」設定を出す
  canCommitStudyLog: boolean;
  // 復習リマインドの文面に出す、今の復習候補の件数
  reviewCount: number;
}

// フッター「その他」→「設定」。以前はヘッダーにアイコンだけで置いていた
// 「明るさの切り替え」と「ログアウト」をここへ集約している。
// ヘッダーはアイコンが並びすぎて何のボタンか分かりにくく、
// 誤ってログアウトを押してしまう位置でもあったため
export default function SettingsDialog({ open, onClose, onLogout, isGuest, canCommitStudyLog, reviewCount }: SettingsDialogProps) {
  const { mode, toggle } = useContext(ColorModeContext);
  const fullScreenDialog = useFullScreenDialog();
  const [studyLogEnabled, setStudyLogEnabled] = useState(isStudyLogCommitEnabled);
  const { showToast } = useToast();
  const notificationSupported = isNotificationSupported();
  const [remindersOn, setRemindersOn] = useState(isRemindersEnabled);

  // オンにするときだけ通知の許可を求める。ブロックされている場合は、
  // ブラウザ側の設定を変えないと有効にできないことをそのまま伝える
  const handleToggleReminders = async (next: boolean) => {
    if (!next) {
      setRemindersEnabled(false);
      setRemindersOn(false);
      return;
    }
    const permission = await requestAndEnableReminders();
    if (permission === "granted") {
      setRemindersOn(true);
      void showTestReminder(reviewCount);
      return;
    }
    setRemindersOn(false);
    showToast(
      permission === "denied"
        ? "ブラウザで通知がブロックされています。サイトの設定から通知を許可してください。"
        : "この環境では通知を使えません。",
      "info"
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SettingsOutlinedIcon color="primary" />
        設定
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              画面の明るさ
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              夜間や暗い場所ではダークにすると目が疲れにくくなります。
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={mode}
              onChange={(_, v: "light" | "dark" | null) => {
                // ColorModeContextは「切り替え」しか持たないため、
                // 今と違う側が選ばれたときだけ反転させる
                if (v && v !== mode) toggle();
              }}
            >
              <ToggleButton value="light">
                <Brightness7Icon fontSize="small" sx={{ mr: 0.5 }} />
                ライト
              </ToggleButton>
              <ToggleButton value="dark">
                <Brightness4Icon fontSize="small" sx={{ mr: 0.5 }} />
                ダーク
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {notificationSupported && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                復習のリマインド
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                復習の期日が来たメモがあるとき、アプリを開いたタイミングで通知でお知らせします。
                アプリを閉じている間に届く通知ではありません。
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={remindersOn}
                    onChange={(e) => void handleToggleReminders(e.target.checked)}
                  />
                }
                label={remindersOn ? "通知する" : "通知しない"}
              />
            </Box>
          )}

          {canCommitStudyLog && (
            <>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  学習ログをGitHubに残す
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  学習用メモを書いた日に、連携中のリポジトリの study-log
                  フォルダへ1行ずつ記録します。コミットが積み上がるので、GitHubのプロフィールに草が生えます。
                  記録されるのはメモのタイトルと操作内容だけで、本文は含みません。
                  チェック用・通常のメモは記録しません。
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={studyLogEnabled}
                      onChange={(e) => {
                        setStudyLogEnabled(e.target.checked);
                        setStudyLogCommitEnabled(e.target.checked);
                      }}
                    />
                  }
                  label={studyLogEnabled ? "コミットする" : "コミットしない"}
                />
              </Box>
            </>
          )}

          <Divider />

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {isGuest ? "ゲストデータの消去" : "ログアウト"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {isGuest
                ? "この端末に保存されているお試し用のプラン・メモをすべて削除します。"
                : "このブラウザからログアウトします。目標・プラン・メモは消えず、次回ログインすればそのまま続きから使えます。"}
            </Typography>
            <Button
              variant="outlined"
              color={isGuest ? "error" : "inherit"}
              startIcon={isGuest ? <DeleteSweepOutlinedIcon /> : <LogoutIcon />}
              onClick={() => {
                onClose();
                onLogout();
              }}
            >
              {isGuest ? "データを消去" : "ログアウト"}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
