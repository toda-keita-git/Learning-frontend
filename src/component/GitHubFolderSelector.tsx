import { useEffect, useState } from "react";
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
  setSelectedPath: (path: string) => void;
}

export default function GitHubFolderSelector({
  open,
  onClose,
  onSelectFolder,
  githubLogin,
  repoName,
  accessToken,
  setSelectedPath,
}: GitHubFolderSelectorProps) {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("");

  const octokit = new Octokit({ auth: accessToken });

  useEffect(() => {
    if (open) {
      loadFolders("");
      setSelectedFolder("");
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
    } catch {
      setError("フォルダーの読み込みに失敗しました。");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folderPath =
      currentPath === "" ? newFolderName : `${currentPath}/${newFolderName}`;
    const dummyFilePath = `${folderPath}/.keep`;

    try {
      const content = btoa("This folder is intentionally left empty.");

      await octokit.repos.createOrUpdateFileContents({
        owner: githubLogin,
        repo: repoName,
        path: dummyFilePath,
        message: `Create folder: ${folderPath}`,
        content,
      });

      setNewFolderName("");
      await loadFolders(currentPath);

      setSelectedFolder(folderPath);
      setSelectedPath(folderPath);
    } catch (err: any) {
      console.error(err);
      setError("フォルダーの作成に失敗しました。");
    }
  };

  const handleSelectFolder = (folder: string) => {
    setSelectedFolder(folder);
    setSelectedPath(folder);
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
                  onClick={() => handleSelectFolder(folder)}
                  onDoubleClick={() => {
                    onSelectFolder(folder);
                    onClose();
                  }}
                  selected={selectedFolder === folder}
                >
                  <ListItemText primary={folder} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {/* ✅ 新規フォルダ作成欄（選択中フォルダを上に表示） */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
            現在の選択フォルダー:
          </Typography>
          <TextField
            size="small"
            fullWidth
            value={selectedFolder || "(未選択)"}
            InputProps={{ readOnly: true }}
          />

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
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
