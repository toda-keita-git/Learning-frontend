import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import { Octokit } from "@octokit/rest";

interface GitHubFolderSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
  githubLogin: string;
  repoName: string;
  accessToken: string;
}

export default function GitHubFolderSelector({
  open,
  onClose,
  onSelectFolder,
  githubLogin,
  repoName,
  accessToken,
}: GitHubFolderSelectorProps) {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const octokit = new Octokit({ auth: accessToken });

  useEffect(() => {
    if (open) {
      loadFolders("");
    }
  }, [open]);

  const loadFolders = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await octokit.repos.getContent({
        owner: githubLogin,
        repo: repoName,
        path,
      });

      const dirs = Array.isArray(response.data)
        ? response.data.filter((item) => item.type === "dir").map((d) => d.path)
        : [];

      setFolders(dirs);
      setCurrentPath(path);
    } catch (err: any) {
      setError("フォルダーの読み込みに失敗しました。");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    try {
      // GitHubのAPIは「空フォルダ作成」が直接できないため、
      // ダミーファイル (e.g. `.keep`) をアップロードしてフォルダを作る
      const dummyFilePath =
        currentPath === ""
          ? `${newFolderName}/.keep`
          : `${currentPath}/${newFolderName}/.keep`;

      await octokit.repos.createOrUpdateFileContents({
        owner: githubLogin,
        repo: repoName,
        path: dummyFilePath,
        message: `Create folder: ${newFolderName}`,
        content: btoa(""), // 空ファイル
      });

      setNewFolderName("");
      loadFolders(currentPath); // 更新
    } catch (err: any) {
      setError("フォルダーの作成に失敗しました。");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>フォルダーを選択または作成</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ textAlign: "center", p: 2 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            {currentPath && (
              <Button size="small" onClick={() => loadFolders("")}>
                ルートに戻る
              </Button>
            )}
            <List dense>
              {folders.map((folder) => (
                <ListItemButton
                  key={folder}
                  onClick={() => loadFolders(folder)}
                  onDoubleClick={() => {
                    onSelectFolder(folder);
                    onClose();
                  }}
                >
                  <ListItemText primary={folder} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
          <TextField
            size="small"
            label="新しいフォルダー名"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <Button variant="contained" onClick={handleCreateFolder}>
            作成
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
}
