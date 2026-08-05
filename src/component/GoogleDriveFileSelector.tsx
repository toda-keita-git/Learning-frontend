import React, { useState, useEffect, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  DialogActions,
  Button,
  Box,
  Typography,
  ListItemIcon,
  CircularProgress,
} from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import { AuthContext } from "../Context";
import { listDriveFolder } from "./driveClient";
import type { DriveItem } from "./driveClient";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onFileSelect: (fileId: string, fileName: string) => void;
}

// GitHubFileSelectorのGoogleドライブ版。このアプリの添付アップロードは
// フォルダ直下にしかファイルを作らないため、GitHub版のようなフォルダ階層の
// 探索は行わず、単一階層の一覧のみを表示する
const GoogleDriveFileSelector: React.FC<Props> = ({ open, onClose, onFileSelect }) => {
  const { driveFolderId, ensureDriveAccessToken } = useContext(AuthContext);
  const fullScreenDialog = useFullScreenDialog();
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !driveFolderId) {
      setItems([]);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      try {
        const accessToken = await ensureDriveAccessToken();
        if (!accessToken) throw new Error("Driveのアクセストークンを取得できませんでした。");
        const files = await listDriveFolder(accessToken, driveFolderId);
        setItems([...files].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Googleドライブのファイル一覧取得に失敗しました", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [open, driveFolderId, ensureDriveAccessToken]);

  const handleSelect = (item: DriveItem) => {
    onFileSelect(item.id, item.name);
  };

  return (
    // disableEnforceFocus: メモ編集ダイアログの上に重ねて開かれるため、
    // フォーカストラップの競合で閉じた後に元のダイアログが操作不能になるのを防ぐ
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" disableEnforceFocus fullScreen={fullScreenDialog}>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 1 }}>
            ファイルを選択
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {items.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <Button size="small" onClick={() => handleSelect(item)}>
                    選択
                  </Button>
                }
              >
                <ListItemIcon>
                  <ArticleIcon />
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
          </List>
        )}
        {!loading && items.length === 0 && <Typography sx={{ p: 2 }}>ファイルがありません</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDriveFileSelector;
