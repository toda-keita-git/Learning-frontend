import React, { useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Breadcrumbs,
  Link,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ArticleIcon from "@mui/icons-material/Article";
import ImageIcon from "@mui/icons-material/Image";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AuthContext } from "../Context";
import { Octokit } from "@octokit/rest";
import { useFullScreenDialog } from "./useFullScreenDialog";
import { getFileType } from "./getFileType";

interface Props {
  open: boolean;
  onClose: () => void;
  // 添付の種別（画像/その他）は拡張子から判定するため、パスと合わせてファイル名も渡す
  onFileSelect: (path: string, name: string) => void;
}

interface AuthContextType {
  octokit: Octokit | null;
  githubLogin: string | null;   // GitHubユーザー名
  repoName: string | null;      // 作成済みリポジトリ名
}

interface RepoItem {
  name: string;
  path: string;
  sha: string;
  type: string;
}

const GitHubFileSelector: React.FC<Props> = ({ open, onClose, onFileSelect }) => {
  const { octokit, githubLogin, repoName } = useContext(AuthContext) as AuthContextType;
  const fullScreenDialog = useFullScreenDialog();
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(false);
  // 「クリックで選ぶ → 下部のボタンで確定」というGoogle Pickerと同じ操作にするため、
  // 選択中のファイルを保持する（フォルダは選択対象にしない）
  const [selected, setSelected] = useState<RepoItem | null>(null);

  // GitHubリポジトリ内容を取得
  useEffect(() => {
    if (!open || !octokit || !githubLogin || !repoName) {
      setItems([]);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      try {
        const { data } = await octokit.repos.getContent({
          owner: githubLogin,
          repo: repoName,
          path: currentPath,
        });

        const sortedData = (Array.isArray(data) ? data : [data]).sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "dir" ? -1 : 1;
        });

        setItems(sortedData as RepoItem[]);
      } catch (error) {
        console.error("GitHubコンテンツの取得に失敗しました", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [currentPath, open, octokit, githubLogin, repoName]);

  // フォルダはクリックで中に入る。ファイルはクリックで選択状態にするだけで、
  // 確定は下部の「選択」ボタンで行う（誤って添付されるのを防ぐため）
  const handleItemClick = (item: RepoItem) => {
    if (item.type === "dir") {
      setSelected(null);
      setCurrentPath(item.path);
      return;
    }
    setSelected((prev) => (prev?.path === item.path ? null : item));
  };

  const handleBack = () => {
    setSelected(null);
    setCurrentPath((prev) => prev.split("/").slice(0, -1).join("/"));
  };

  const handleConfirm = () => {
    if (!selected) return;
    onFileSelect(selected.path, selected.name);
  };

  useEffect(() => {
    if (open) {
      setCurrentPath("");
      setSelected(null);
    }
  }, [open]);

  const segments = currentPath ? currentPath.split("/") : [];

  return (
    // disableEnforceFocus: 学習内容の登録・編集ダイアログの上に重ねて開かれるため、
    // フォーカストラップの競合で閉じた後に元のダイアログが操作不能になるのを防ぐ
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      disableEnforceFocus
      fullScreen={fullScreenDialog}
      // Google Pickerと同じくらいの大きさに揃えて、切り替えても違和感が出ないようにする
      PaperProps={fullScreenDialog ? undefined : { sx: { height: "min(650px, calc(100% - 32px))" } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5 }}>
        <IconButton onClick={handleBack} edge="start" disabled={!currentPath} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs sx={{ flexGrow: 1, minWidth: 0 }}>
          <Link
            component="button"
            type="button"
            underline={currentPath ? "hover" : "none"}
            color={currentPath ? "primary" : "text.primary"}
            onClick={() => {
              setSelected(null);
              setCurrentPath("");
            }}
          >
            {repoName ?? "リポジトリ"}
          </Link>
          {segments.map((segment, index) => {
            const path = segments.slice(0, index + 1).join("/");
            const isLast = index === segments.length - 1;
            return isLast ? (
              <Typography key={path} color="text.primary">
                {segment}
              </Typography>
            ) : (
              <Link
                key={path}
                component="button"
                type="button"
                underline="hover"
                onClick={() => {
                  setSelected(null);
                  setCurrentPath(path);
                }}
              >
                {segment}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Typography sx={{ p: 2 }} color="text.secondary">
            ファイルがありません
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 1.5,
            }}
          >
            {items.map((item) => {
              const isDir = item.type === "dir";
              const isSelected = selected?.path === item.path;
              const isImage = !isDir && getFileType(item.name) === "image";
              return (
                <Box
                  key={item.sha}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => {
                    // ファイルはダブルクリックでそのまま確定できるようにする
                    if (!isDir) onFileSelect(item.path, item.name);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.25,
                    borderRadius: 1,
                    cursor: "pointer",
                    border: 1,
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "action.selected" : "background.paper",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  {isDir ? (
                    <FolderIcon color="action" />
                  ) : isImage ? (
                    <ImageIcon color="action" />
                  ) : (
                    <ArticleIcon color="action" />
                  )}
                  <Typography variant="body2" noWrap title={item.name}>
                    {item.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {/* フォルダは選択できないので、ファイルを選ぶまで確定ボタンは押せない */}
        <Button onClick={handleConfirm} variant="contained" disabled={!selected}>
          選択
        </Button>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GitHubFileSelector;
