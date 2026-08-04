import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Radio,
} from "@mui/material";
import FolderSpecialIcon from "@mui/icons-material/FolderSpecial";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicIcon from "@mui/icons-material/Public";
import { Octokit } from "@octokit/rest";
import { selectRepoApi } from "./Api";
import { useToast } from "../ToastContext";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface RepoOption {
  name: string;
  isPrivate: boolean;
  updatedAt: string | null;
}

interface RepoSelectDialogProps {
  open: boolean;
  onClose: () => void;
  accessToken: string;
  currentRepoName: string;
  onSelected: (repoName: string) => void;
}

export default function RepoSelectDialog({
  open,
  onClose,
  accessToken,
  currentRepoName,
  onSelected,
}: RepoSelectDialogProps) {
  const { showToast } = useToast();
  const fullScreenDialog = useFullScreenDialog();
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(currentRepoName);
  const [saving, setSaving] = useState(false);

  const octokit = useMemo(() => new Octokit({ auth: accessToken }), [accessToken]);

  useEffect(() => {
    if (!open) return;
    setSelected(currentRepoName);
    setError(null);
    const loadRepos = async () => {
      setLoading(true);
      try {
        const response = await octokit.repos.listForAuthenticatedUser({
          affiliation: "owner",
          sort: "updated",
          per_page: 100,
        });
        setRepos(
          response.data.map((r) => ({
            name: r.name,
            isPrivate: !!r.private,
            updatedAt: r.updated_at ?? null,
          }))
        );
      } catch (err) {
        console.error("listForAuthenticatedUser error:", err);
        setError("リポジトリ一覧の取得に失敗しました。時間をおいて、もう一度お試しください。");
      } finally {
        setLoading(false);
      }
    };
    loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentRepoName]);

  const handleConfirm = async () => {
    if (!selected || selected === currentRepoName) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const updated = await selectRepoApi(selected);
      onSelected(updated);
      showToast(`使用するリポジトリを「${updated}」に切り替えました。`, "success");
      onClose();
    } catch (err) {
      console.error("selectRepoApi error:", err);
      showToast("リポジトリの切り替えに失敗しました。時間をおいて、もう一度お試しください。", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" disableEnforceFocus fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FolderSpecialIcon color="primary" /> 使用するリポジトリを選ぶ
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
          学習記録の添付ファイルを保存するリポジトリを、あなたが既に持っているリポジトリから選べます。過去の記録の添付リンクには影響しません。
        </Typography>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        <Box
          sx={{
            border: "1px solid #eceef3",
            borderRadius: 2,
            minHeight: 160,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : repos.length > 0 ? (
            <List dense disablePadding>
              {repos.map((repo) => (
                <ListItemButton
                  key={repo.name}
                  onClick={() => setSelected(repo.name)}
                  selected={selected === repo.name}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Radio
                      checked={selected === repo.name}
                      size="small"
                      onChange={() => setSelected(repo.name)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={repo.name}
                    secondary={
                      repo.name === currentRepoName ? "現在使用中" : undefined
                    }
                  />
                  <Chip
                    size="small"
                    icon={repo.isPrivate ? <LockOutlinedIcon /> : <PublicIcon />}
                    label={repo.isPrivate ? "非公開" : "公開"}
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : (
            !error && (
              <Box sx={{ textAlign: "center", color: "text.secondary", p: 3 }}>
                <Typography variant="body2">リポジトリが見つかりませんでした。</Typography>
              </Box>
            )
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={saving || !selected}
        >
          {saving ? "切り替え中…" : "このリポジトリを使う"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
