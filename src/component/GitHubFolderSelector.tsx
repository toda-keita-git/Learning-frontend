import { useEffect, useMemo, useState } from "react";
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
  FormControlLabel,
  Checkbox,
  Stack,
} from "@mui/material";
import { Octokit } from "@octokit/rest";

interface GitHubFolderSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void; // ダブルクリックで確定
  githubLogin: string;
  repoName: string;
  accessToken: string;
  setSelectedPath: (path: string) => void; // 選択時に親コンポーネントに反映
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
  const [currentPath, setCurrentPath] = useState(""); // 現在開いている階層（"" はルート）
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [createInSelectedFolder, setCreateInSelectedFolder] = useState(false);

  // OctokitをaccessTokenに応じて再生成（古いインスタンスによる問題回避）
  const octokit = useMemo(() => {
    return new Octokit({ auth: accessToken });
  }, [accessToken]);

  useEffect(() => {
    if (open) {
      // ダイアログオープン時にはルートを読み込み、選択をクリア
      loadFolders("");
      setSelectedFolder("");
      setCurrentPath("");
      setError(null);
      setNewFolderName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadFolders = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      // GitHub API: root の場合は "" をそのまま渡す
      const response = await octokit.repos.getContent({
        owner: githubLogin,
        repo: repoName,
        path: path || "",
      });

      const dirs = Array.isArray(response.data)
        ? response.data
            .filter((item: any) => item.type === "dir")
            .map((d: any) => d.path)
        : [];

      setFolders(dirs);
      setCurrentPath(path || "");
    } catch (err: any) {
      console.error("loadFolders error:", err);
      // エラーメッセージが取れる場合は詳細を表示
      const msg =
        err?.message ||
        "フォルダーの読み込みに失敗しました（詳細不明）。";
      setError(`${msg}${err?.status ? ` (status: ${err.status})` : ""}`);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  // フォルダクリック時 -> 選択してその階層を開く（開く/選択を分離することで挙動が明確）
  const handleClickFolder = (folder: string) => {
    // 選択はするが、開くのは loadFolders を呼ぶ（ユーザーが中に入る挙動）
    setSelectedFolder(folder);
  };

  // フォルダを開く（フォルダ名をダブルクリック、または「開く」ボタン）
  const handleOpenFolder = async (folder: string) => {
    await loadFolders(folder);
    // 開いたら選択は空にする or 維持するかは要件次第。ここでは選択は継続。
    setSelectedFolder(folder);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setError(null);

    // basePath の決定：選択中フォルダに作るモードか、今開いている階層に作るか
    const basePath =
      createInSelectedFolder && selectedFolder ? selectedFolder : currentPath;

    const folderPath = basePath ? `${basePath}/${newFolderName}` : newFolderName;
    const dummyFilePath = `${folderPath}/.keep`;

    try {
      // content は base64
      const content = typeof window !== "undefined" && (window as any).btoa
        ? (window as any).btoa("This folder is intentionally left empty.")
        : Buffer.from("This folder is intentionally left empty.").toString(
            "base64"
          );

      await octokit.repos.createOrUpdateFileContents({
        owner: githubLogin,
        repo: repoName,
        path: dummyFilePath,
        message: `Create folder: ${folderPath}`,
        content,
      });

      // 作成後は入力リセット、一覧更新（basePath の階層を再読み込み）
      setNewFolderName("");
      // basePath があるならその階層を再読み込みして新規フォルダを見えるようにする
      await loadFolders(basePath || "");

      // 選択を新規フォルダに変更して親コンポーネントにも反映
      setSelectedFolder(folderPath);
      setSelectedPath(folderPath);
    } catch (err: any) {
      console.error("create folder error:", err);
      const msg =
        err?.message ||
        "フォルダーの作成に失敗しました（詳細不明）。トークン権限やパスを確認してください。";
      setError(`${msg}${err?.status ? ` (status: ${err.status})` : ""}`);
    }
  };

  const handleSelectFolder = () => {
    if (!selectedFolder) {
      setError("フォルダーが選択されていません。");
      return;
    }
    // 親コンポーネントへ選択を通知（「選択して決定」）
    setSelectedPath(selectedFolder);
  };

  const handleConfirmAndClose = () => {
    if (selectedFolder) {
      onSelectFolder(selectedFolder);
      onClose();
    } else {
      setError("フォルダーが選択されていません。");
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
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        ) : null}

        {/* ナビゲーション（ルートに戻る / 現在のパス表示） */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Button
            size="small"
            onClick={() => loadFolders("")}
            disabled={loading || currentPath === ""}
          >
            ルートに戻る
          </Button>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            開いている階層: {currentPath || "(ルート)"}
          </Typography>
        </Stack>

        {/* フォルダ一覧 */}
        <List dense>
          {folders.map((folder) => (
            <ListItemButton
              key={folder}
              onClick={() => handleClickFolder(folder)}
              onDoubleClick={() => handleOpenFolder(folder)}
              selected={selectedFolder === folder}
            >
              <ListItemText primary={folder} />
            </ListItemButton>
          ))}
          {folders.length === 0 && !loading && (
            <Typography variant="body2" sx={{ color: "text.secondary", p: 1 }}>
              この階層にフォルダはありません。
            </Typography>
          )}
        </List>

        {/* 選択操作ボタン */}
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button
            size="small"
            onClick={() => selectedFolder && handleOpenFolder(selectedFolder)}
            disabled={!selectedFolder}
          >
            開く
          </Button>
          <Button
            size="small"
            onClick={handleSelectFolder}
            disabled={!selectedFolder}
          >
            選択（一覧に反映）
          </Button>
          <Button
            size="small"
            onClick={() => {
              setSelectedFolder("");
              setSelectedPath("");
            }}
          >
            選択クリア
          </Button>
        </Box>

        {/* 新規フォルダ作成 */}
        <Box sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            sx={{ mb: 1, color: "text.secondary" }}
          >
            現在の選択フォルダー:
          </Typography>
          <TextField
            size="small"
            fullWidth
            value={selectedFolder || "(未選択)"}
            InputProps={{ readOnly: true }}
          />

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={createInSelectedFolder}
                  onChange={(e) => setCreateInSelectedFolder(e.target.checked)}
                />
              }
              label="選択中のフォルダの中に作成する（未選択時は現在の階層に作成）"
            />
          </Box>

          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <TextField
              size="small"
              label="新しいフォルダー名"
              fullWidth
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
            <Button variant="contained" onClick={handleCreateFolder}>
              作成
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        <Button onClick={handleConfirmAndClose} variant="contained">
          選択して決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}
