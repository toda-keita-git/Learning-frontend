import { useEffect, useMemo, useRef, useState } from "react";
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
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Octokit } from "@octokit/rest";
import { useToast } from "../ToastContext";
import RepoSelectDialog from "./RepoSelectDialog";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface GitHubFolderSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
  githubLogin: string;
  repoName: string;
  accessToken: string;
  setSelectedPath: (path: string) => void;
  // trueの場合、フォルダー選択(このフォルダーに保存)ではなく、フォルダー・
  // ファイルをその場で管理するための単体ダイアログとして振る舞う
  // （ファイルのアップロード・新規作成もできるようになる）
  standalone?: boolean;
  // standalone時のみ使用。使用するリポジトリを既存のものに切り替えた後に呼ばれる
  onRepoChanged?: (repoName: string) => void;
}

export default function GitHubFolderSelector({
  open,
  onClose,
  onSelectFolder,
  githubLogin,
  repoName,
  accessToken,
  setSelectedPath,
  standalone = false,
  onRepoChanged,
}: GitHubFolderSelectorProps) {
  const { showToast } = useToast();
  const fullScreenDialog = useFullScreenDialog();
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<{ path: string; sha: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(""); // "" はルート
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [repoSelectOpen, setRepoSelectOpen] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const octokit = useMemo(
    () => new Octokit({ auth: accessToken }),
    [accessToken]
  );

  useEffect(() => {
    if (open) {
      setCurrentPath("");
      setNewFolderName("");
      setNewFileName("");
      setNewFileContent("");
      setError(null);
      loadFolders("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repoName]);

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
      const items = Array.isArray(response.data) ? response.data : [];
      const dirs = items
        .filter((item: any) => item.type === "dir")
        .map((d: any) => d.path);
      const fileItems = items
        .filter((item: any) => item.type === "file")
        .map((f: any) => ({ path: f.path, sha: f.sha }));
      setFolders(dirs);
      setFiles(fileItems);
      setCurrentPath(path || "");
    } catch (err: any) {
      console.error("loadFolders error:", err);
      if (err?.status === 404 && !path) {
        // ルートで404 = まだ空のリポジトリ。エラー扱いにしない
        setFolders([]);
        setFiles([]);
        setCurrentPath("");
        setError(null);
      } else if (err?.status === 401 || err?.status === 403) {
        setError(
          "GitHubへのアクセス権限がありません。一度ログインし直してからお試しください。"
        );
        setFolders([]);
        setFiles([]);
      } else {
        setError(
          "フォルダーの読み込みに失敗しました。時間をおいて、もう一度お試しください。"
        );
        setFolders([]);
        setFiles([]);
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

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = (err) => reject(err);
    });

  // 同名のファイルが既に存在するかを確認する（アップロード・作成の誤上書き防止）。
  // 404（存在しない）だけをfalse扱いにする。401/403やネットワークエラーまで
  // 「存在しない」と誤判定すると、本当の原因が隠れたままアップロードに進んで
  // しまい、失敗理由が分かりにくくなるため呼び出し元に投げ直す
  const fileExists = async (path: string): Promise<boolean> => {
    try {
      await octokit.repos.getContent({ owner: githubLogin, repo: repoName, path });
      return true;
    } catch (err: any) {
      if (err?.status === 404) return false;
      throw err;
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // 同じファイルを続けて選べるようにリセット
    if (!file) return;

    setError(null);
    setUploading(true);
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    try {
      if (await fileExists(path)) {
        setError(`「${file.name}」は既にこのフォルダーに存在します。別の名前にするか、既存ファイルを直接編集してください。`);
        return;
      }
      const content = await toBase64(file);
      await octokit.repos.createOrUpdateFileContents({
        owner: githubLogin,
        repo: repoName,
        path,
        message: `Add ${path}`,
        content,
      });
      showToast(`「${file.name}」をアップロードしました。`, "success");
      await loadFolders(currentPath);
    } catch (err: any) {
      console.error("upload file error:", err);
      if (err?.status === 401 || err?.status === 403) {
        setError("GitHubへのアクセス権限がありません。一度ログインし直してからお試しください。");
      } else if (err?.status === 404) {
        setError("リポジトリが見つかりませんでした。使用するリポジトリの設定を確認してください。");
      } else if (err?.status === 413 || err?.status === 422) {
        setError("ファイルサイズが大きすぎる可能性があります（目安として100MBまで）。別のファイルでお試しください。");
      } else {
        setError("ファイルのアップロードに失敗しました。時間をおいて、もう一度お試しください。");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFile = async () => {
    const name = newFileName.trim();
    if (!name) return;
    if (/[\\/]/.test(name)) {
      setError("ファイル名に「/」や「\\」は使えません。");
      return;
    }
    setError(null);
    setCreatingFile(true);
    const path = currentPath ? `${currentPath}/${name}` : name;
    try {
      if (await fileExists(path)) {
        setError(`「${name}」は既にこのフォルダーに存在します。別の名前を使ってください。`);
        return;
      }
      // UTF-8対応でBase64に変換（日本語などLatin1範囲外の文字を含む場合に備える）
      const content = btoa(unescape(encodeURIComponent(newFileContent)));
      await octokit.repos.createOrUpdateFileContents({
        owner: githubLogin,
        repo: repoName,
        path,
        message: `Create ${path}`,
        content,
      });
      setNewFileName("");
      setNewFileContent("");
      showToast(`「${name}」を作成しました。`, "success");
      await loadFolders(currentPath);
    } catch (err: any) {
      console.error("create file error:", err);
      if (err?.status === 401 || err?.status === 403) {
        setError("GitHubへのアクセス権限がありません。一度ログインし直してからお試しください。");
      } else if (err?.status === 404) {
        setError("リポジトリが見つかりませんでした。使用するリポジトリの設定を確認してください。");
      } else {
        setError("ファイルの作成に失敗しました。時間をおいて、もう一度お試しください。");
      }
    } finally {
      setCreatingFile(false);
    }
  };

  // アップロード済み・作成済みのファイルを削除する
  const handleDeleteFile = async (path: string, sha: string) => {
    if (
      !window.confirm(`「${baseName(path)}」を削除しますか？この操作は元に戻せません。`)
    )
      return;
    setError(null);
    setDeletingPath(path);
    try {
      await octokit.repos.deleteFile({
        owner: githubLogin,
        repo: repoName,
        path,
        message: `Delete ${path}`,
        sha,
      });
      showToast(`「${baseName(path)}」を削除しました。`, "success");
      await loadFolders(currentPath);
    } catch (err: any) {
      console.error("delete file error:", err);
      if (err?.status === 401 || err?.status === 403) {
        setError("GitHubへのアクセス権限がありません。一度ログインし直してからお試しください。");
      } else if (err?.status === 404) {
        setError("ファイルが見つかりませんでした。一覧を更新してから、もう一度お試しください。");
      } else if (err?.status === 409) {
        setError("ファイルが別の場所で更新されているため削除できませんでした。一覧を更新してから、もう一度お試しください。");
      } else {
        setError("ファイルの削除に失敗しました。時間をおいて、もう一度お試しください。");
      }
    } finally {
      setDeletingPath(null);
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
    // disableEnforceFocus: このダイアログは他のダイアログ（学習内容の登録・編集）の上に
    // 重ねて開かれることがあり、フォーカストラップ同士が競合すると閉じた後に
    // 元のダイアログ側の操作（プルダウン選択など）が反応しなくなることがあるための対策
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" disableEnforceFocus fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FolderIcon color="primary" /> {standalone ? "ファイル・フォルダーの管理" : "保存先フォルダーを選ぶ"}
      </DialogTitle>
      <DialogContent dividers>
        {standalone && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              flexWrap: "wrap",
              mb: 2,
              p: 1.25,
              border: "1px solid #eceef3",
              borderRadius: 2,
            }}
          >
            <Typography variant="body2">
              使用するリポジトリ: <strong>{repoName}</strong>
            </Typography>
            <Button
              size="small"
              startIcon={<SwapHorizIcon />}
              onClick={() => setRepoSelectOpen(true)}
            >
              変更する
            </Button>
          </Box>
        )}

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
          {standalone
            ? "フォルダーをクリックすると中に入ります。今いるフォルダーの中に、新しいフォルダー・ファイルを追加できます。"
            : "フォルダーをクリックすると中に入ります。保存先が決まったら「このフォルダーに保存」を押してください。"}
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
          ) : folders.length > 0 || (standalone && files.length > 0) ? (
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
              {standalone &&
                files.map((file) => (
                  <Box
                    key={file.path}
                    sx={{ display: "flex", alignItems: "center", pl: 2, pr: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <InsertDriveFileOutlinedIcon sx={{ color: "text.disabled" }} />
                    </ListItemIcon>
                    <ListItemText primary={baseName(file.path)} sx={{ flex: 1 }} />
                    <Tooltip title="削除">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deletingPath === file.path}
                          onClick={() => handleDeleteFile(file.path, file.sha)}
                        >
                          {deletingPath === file.path ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DeleteOutlineIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ))}
            </List>
          ) : (
            <Box sx={{ textAlign: "center", color: "text.secondary", p: 3 }}>
              <Typography variant="body2">
                {standalone
                  ? "このフォルダーの中に、ファイルもサブフォルダーもありません。"
                  : "このフォルダーの中に、サブフォルダーはありません。"}
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

        {standalone && (
          <>
            <Divider sx={{ my: 2 }} />

            {/* ファイルのアップロード（今いる場所に追加する） */}
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              「{segments.length === 0 ? "ルート" : baseName(currentPath)}」にファイルを追加する
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileInputChange}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              sx={{ mb: 2 }}
            >
              {uploading ? "アップロード中…" : "ファイルをアップロード"}
            </Button>

            {/* ファイルの新規作成（今いる場所に作る） */}
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              「{segments.length === 0 ? "ルート" : baseName(currentPath)}」に新しいファイルを作る
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="新しいファイル名（例: memo.md）"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <NoteAddOutlinedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={3}
              placeholder="ファイルの内容（空でも作成できます）"
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Button
              variant="outlined"
              startIcon={<NoteAddOutlinedIcon />}
              onClick={handleCreateFile}
              disabled={creatingFile || !newFileName.trim()}
            >
              {creatingFile ? "作成中…" : "ファイルを作成"}
            </Button>
          </>
        )}
      </DialogContent>

      <DialogActions>
        {standalone ? (
          <Button onClick={onClose} variant="contained">
            とじる
          </Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">
              キャンセル
            </Button>
            <Button onClick={handleUseThisFolder} variant="contained">
              このフォルダーに保存
            </Button>
          </>
        )}
      </DialogActions>

      {standalone && (
        <RepoSelectDialog
          open={repoSelectOpen}
          onClose={() => setRepoSelectOpen(false)}
          accessToken={accessToken}
          currentRepoName={repoName}
          onSelected={(newRepoName) => onRepoChanged?.(newRepoName)}
        />
      )}
    </Dialog>
  );
}
