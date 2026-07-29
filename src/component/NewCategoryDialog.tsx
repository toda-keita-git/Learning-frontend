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

  const trimmed = name.trim();
  // 入力中の文字列で既存カテゴリーを部分一致（大文字小文字を区別しない）で絞り込む。
  // 検索ボタンは作らず、入力するたびに自動で絞り込まれる
  const filteredCategories = trimmed
    ? existingCategories.filter((c) =>
        c.toLowerCase().includes(trimmed.toLowerCase())
      )
    : existingCategories;
  const isDuplicate = existingCategories.some(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );

  const handleSubmit = () => {
    if (trimmed && !isDuplicate) {
      onSubmit(trimmed);
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
              既存のカテゴリー{trimmed && `（「${trimmed}」を含むもの）`}
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
              {filteredCategories.length > 0 ? (
                <List dense>
                  {filteredCategories.map((category) => (
                    <ListItem key={category}>
                      <ListItemText primary={category} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ p: 2, textAlign: "center" }}
                >
                  一致するカテゴリーはありません
                </Typography>
              )}
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
          error={isDuplicate}
          helperText={isDuplicate ? "そのカテゴリーは既に存在します" : " "}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit} disabled={!trimmed || isDuplicate}>
          登録
        </Button>
      </DialogActions>
    </Dialog>
  );
}
