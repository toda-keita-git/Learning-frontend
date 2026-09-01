import React, { useEffect, useState } from "react";
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
  Chip,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachmentIcon from "@mui/icons-material/Attachment";
import { useFullScreenDialog } from "./useFullScreenDialog";
import { listDriveSubfolders, type DriveFolderItem } from "./driveClient";
import { openGoogleDriveScopedPicker, type PickedDriveFile } from "./googlePicker";

interface Props {
  open: boolean;
  accessToken: string | null;
  // アプリが作成した添付フォルダへのショートカット表示用（無ければ非表示）
  driveFolderId: string | null;
  onClose: () => void;
  onPick: (file: PickedDriveFile) => void;
}

interface Crumb {
  id: string;
  name: string;
}

const ROOT_CRUMB: Crumb = { id: "root", name: "マイドライブ" };

// Google Picker純正の「マイドライブ全体」タブは、フォルダを開くのに
// 「タップして選択→もう一度タップして開く」という2段階操作が必要で、
// スマホでは1タップでは反応しないように感じられる（Picker自身のUI仕様で、
// 公開APIから変更できない）。
//
// そのためフォルダの階層移動だけはこのアプリ独自の一覧で行い（1タップで確実に
// 階層を移動できる）、最後に特定のファイルを選ぶ操作だけをGoogle純正のPickerへ
// 引き継ぐ。drive.fileスコープの「Pickerで明示的に開いたファイルにはアクセス
// できる」という例外は、自前の一覧をタップしただけでは成立しないため
const GoogleDriveFolderBrowser: React.FC<Props> = ({ open, accessToken, driveFolderId, onClose, onPick }) => {
  const fullScreenDialog = useFullScreenDialog();
  const [path, setPath] = useState<Crumb[]>([ROOT_CRUMB]);
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const currentFolder = path[path.length - 1];

  useEffect(() => {
    if (open) setPath([ROOT_CRUMB]);
  }, [open]);

  useEffect(() => {
    if (!open || !accessToken) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listDriveSubfolders(accessToken, currentFolder.id)
      .then((items) => {
        if (!cancelled) setFolders(items);
      })
      .catch(() => {
        if (!cancelled) setError("フォルダ一覧の取得に失敗しました。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, accessToken, currentFolder.id]);

  const handleEnterFolder = (folder: DriveFolderItem) => {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBack = () => {
    setPath((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const runScopedPicker = async (parentId: string, label: string) => {
    if (!accessToken) return;
    setOpening(true);
    try {
      const picked = await openGoogleDriveScopedPicker(accessToken, parentId, label);
      if (picked) onPick(picked);
    } finally {
      setOpening(false);
    }
  };

  return (
    // disableEnforceFocus: メモ編集ダイアログの上に重ねて開かれるため、
    // フォーカストラップの競合で閉じた後に元のダイアログが操作不能になるのを防ぐ
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      disableEnforceFocus
      fullScreen={fullScreenDialog}
      PaperProps={fullScreenDialog ? undefined : { sx: { height: "min(650px, calc(100% - 32px))" } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5 }}>
        <IconButton onClick={handleBack} edge="start" disabled={path.length <= 1} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs sx={{ flexGrow: 1, minWidth: 0 }}>
          {path.map((crumb, index) => {
            const isLast = index === path.length - 1;
            return isLast ? (
              <Typography key={crumb.id} color="text.primary">
                {crumb.name}
              </Typography>
            ) : (
              <Link
                key={crumb.id}
                component="button"
                type="button"
                underline="hover"
                onClick={() => setPath((prev) => prev.slice(0, index + 1))}
              >
                {crumb.name}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>

      {driveFolderId && path.length === 1 && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Chip
            icon={<AttachmentIcon />}
            label="このアプリの添付フォルダから選ぶ"
            onClick={() => runScopedPicker(driveFolderId, "このアプリの添付フォルダ")}
            disabled={opening}
            clickable
          />
        </Box>
      )}

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography sx={{ p: 2 }} color="error">
            {error}
          </Typography>
        ) : folders.length === 0 ? (
          <Typography sx={{ p: 2 }} color="text.secondary">
            サブフォルダはありません。
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 1.5,
            }}
          >
            {folders.map((folder) => (
              <Box
                key={folder.id}
                onClick={() => handleEnterFolder(folder)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.25,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <FolderIcon color="action" />
                <Typography variant="body2" noWrap title={folder.name}>
                  {folder.name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => runScopedPicker(currentFolder.id, `「${currentFolder.name}」から選ぶ`)}
          variant="contained"
          disabled={opening}
          startIcon={opening ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          このフォルダのファイルから選ぶ
        </Button>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDriveFolderBrowser;
