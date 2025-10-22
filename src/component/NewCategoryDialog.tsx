import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
// 既存カテゴリーリスト表示のためにMUIコンポーネントをインポート
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";

interface NewCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string) => void;
  // ★ 既存のカテゴリーリストを受け取るためのプロパティを追加
  existingCategories?: string[];
}

export default function NewCategoryDialog({
  open,
  onClose,
  onSubmit,
  // ★ デフォルト値を空配列に設定
  existingCategories = [],
}: NewCategoryDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>新しいカテゴリーの追加</DialogTitle>
      <DialogContent>
        {/* ★ ここから追加したコード */}
        {existingCategories.length > 0 && (
          <>
            <Typography
              variant="caption"
              color="textSecondary"
              component="p"
              sx={{ mt: 1 }}
            >
              既存のカテゴリー
            </Typography>
            <Box
              sx={{
                maxHeight: 150,
                overflow: "auto",
                border: "1px solid #ddd",
                borderRadius: 1,
                my: 1,
              }}
            >
              <List dense>
                {existingCategories.map((category) => (
                  <ListItem key={category}>
                    <ListItemText primary={category} />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Divider sx={{ mb: 1 }} />
          </>
        )}
        {/* ★ ここまで追加したコード */}

        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="新しいカテゴリー名" // ラベルをより分かりやすく変更
          type="text"
          fullWidth
          variant="standard"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          登録
        </Button>
      </DialogActions>
    </Dialog>
  );
}
