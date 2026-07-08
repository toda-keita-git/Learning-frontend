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
  TextField,
  CircularProgress,
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Divider,
  InputAdornment,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
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
  const [currentPath, setCurrentPath] = useState(""); // "" はルート
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const octokit = useMemo(
    () => new Octokit({ auth: accessToken }),
    [accessToken]
  );

  useEffect(() => {
    if (open) {
      setCurrentPath("");
      setNewFolderName("");
      setError(null);
      loadFolders("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // フォルダ名だけ取り出す（path の最後の区切り以降）
  const baseName = (p: string) => p.split("/").filter(Boolean).pop() || p;

  const loadFolders = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
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
      if (err?.status === 404 && !path) {
        // ルートで404 = まだ空のリポジトリ。エラー扱いにしない
        setFolders([]);
        setCurrentPath("");
        setError(null);
      } else if (err?.status === 401 || err?.status === 403) {
        setError(
          "GitHubへのアクセス権限がありません。一度ログインし直してからお試しください。"
        );
        setFolders([]);
      } else {
        setError(
          "フォルダーの読み込みに失敗しました。時間をおいて、もう一度お試しください。"
        );
        setFolders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (/[\\/]/.test(name)) {
      setError("フォルダー名に「/」や「\\」は使えません。");
      return;
    }
    setError(null);
    setCreating(true);

    // 「いま開いている階層」の中に作る（直感的）
    const folderPath = currentPath ? `${currentPath}/${name}` : name;
    const dummyFilePath = `${folderPath}/.keep`;

    try {
      const content =
        typeof window !== "undefined" && (window as any).btoa
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

      setNewFolderName("");
      // 作った直後にその中へ移動（作成できたことが体感で分かる）
      await loadFolders(folderPath);
    } catch (err: any) {
      console.error("create folder error:", err);
      if (err?.status === 422) {
        setError("同じ名前のフォルダーが既に存在するようです。別の名前をお試しください。");
      } else if (err?.status === 401 || err?.status === 403) {
        setError("GitHubへのアクセス権限がありません。一度ログインし直してからお試しください。");
      } else {
        setError("フォルダーの作成に失敗しました。フォルダー名を確認して、もう一度お試しください。");
      }
    } finally {
      setCreating(false);
    }
  };

  // パンくず（ルート > A > B ...）
  const segments = currentPath ? currentPath.split("/").filter(Boolean) : [];
  const goToSegment = (index: number) => {
    if (index < 0) {
      loadFolders("");
    } else {
      loadFolders(segments.slice(0, index + 1).join("/"));
    }
  };

  const handleUseThisFolder = () => {
    // いま開いているフォルダーを保存先に決定
    setSelectedPath(currentPath);
    onSelectFolder(currentPath);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FolderIcon color="primary" /> 保存先フォルダーを選ぶ
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
          フォルダーをクリックすると中に入ります。保存先が決まったら「このフォルダーに保存」を押してください。
        </Typography>

        {/* 現在地（パンくず） */}
        <Breadcrumbs sx={{ mb: 1 }} separator="›">
          <Link
            component="button"
            underline="hover"
            color={segments.length === 0 ? "text.primary" : "primary"}
            onClick={() => goToSegment(-1)}
          >
            ルート
          </Link>
          {segments.map((seg, i) => (
            <Link
              key={i}
              component="button"
              underline="hover"
              color={i === segments.length - 1 ? "text.primary" : "primary"}
              onClick={() => goToSegment(i)}
            >
              {seg}
            </Link>
          ))}
        </Breadcrumbs>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        {/* フォルダ一覧 */}
        <Box
          sx={{
            border: "1px solid #eceef3",
            borderRadius: 2,
            minHeight: 160,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : folders.length > 0 ? (
            <List dense disablePadding>
              {folders.map((folder) => (
                <ListItemButton
                  key={folder}
                  onClick={() => loadFolders(folder)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FolderIcon sx={{ color: "#f0ad4e" }} />
                  </ListItemIcon>
                  <ListItemText primary={baseName(folder)} />
                  <ChevronRightIcon sx={{ color: "text.disabled" }} />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: "center", color: "text.secondary", p: 3 }}>
              <Typography variant="body2">
                このフォルダーの中に、サブフォルダーはありません。
              </Typography>
              <Typography variant="caption">
                下の入力欄から新しいフォルダーを作れます。
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 新規作成（今いる場所に作る） */}
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          「{segments.length === 0 ? "ルート" : baseName(currentPath)}」の中に新しいフォルダーを作る
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="新しいフォルダー名"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CreateNewFolderIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            onClick={handleCreateFolder}
            disabled={creating || !newFolderName.trim()}
            sx={{ whiteSpace: "nowrap" }}
          >
            {creating ? "作成中…" : "作成"}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button onClick={handleUseThisFolder} variant="contained">
          このフォルダーに保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
