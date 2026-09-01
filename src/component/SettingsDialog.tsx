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

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  // ゲストモード（userIdがnull）ではログアウトではなく端末内データの消去になるため、
  // 同じボタンでも文言と色を変える
  isGuest: boolean;
  // GitHub連携済みのときだけ「学習ログをコミットする」設定を出す
  canCommitStudyLog: boolean;
}

// フッター「その他」→「設定」。以前はヘッダーにアイコンだけで置いていた
// 「明るさの切り替え」と「ログアウト」をここへ集約している。
// ヘッダーはアイコンが並びすぎて何のボタンか分かりにくく、
// 誤ってログアウトを押してしまう位置でもあったため
export default function SettingsDialog({ open, onClose, onLogout, isGuest, canCommitStudyLog }: SettingsDialogProps) {
  const { mode, toggle } = useContext(ColorModeContext);
  const fullScreenDialog = useFullScreenDialog();
  const [studyLogEnabled, setStudyLogEnabled] = useState(isStudyLogCommitEnabled);

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

          {canCommitStudyLog && (
            <>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  学習ログをGitHubに残す
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  メモを書いた日に、連携中のリポジトリの study-log
                  フォルダへ1行ずつ記録します。コミットが積み上がるので、GitHubのプロフィールに草が生えます。
                  記録されるのはメモのタイトルと操作内容だけで、本文は含みません。
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

              <Divider />
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
