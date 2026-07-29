import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

interface NewTagDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (tagName: string) => void;
  existingTags?: string[];
}

export default function NewTagDialog({
  open,
  onClose,
  onSubmit,
  existingTags = [],
}: NewTagDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const trimmed = name.trim().replace(/^#/, ""); // 先頭の#は取り除く
  const isDuplicate = existingTags.some(
    (t) => t.toLowerCase() === trimmed.toLowerCase()
  );
  // 入力中の文字列で既存タグを部分一致（大文字小文字を区別しない）で絞り込む。
  // 検索ボタンは作らず、入力するたびに自動で絞り込まれる
  const filteredTags = trimmed
    ? existingTags.filter((t) => t.toLowerCase().includes(trimmed.toLowerCase()))
    : existingTags;

  const handleSubmit = () => {
    if (trimmed && !isDuplicate) {
      onSubmit(trimmed);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>新しいタグの追加</DialogTitle>
      <DialogContent>
        {existingTags.length > 0 && (
          <>
            <Typography
              variant="caption"
              color="textSecondary"
              component="p"
              sx={{ mt: 1 }}
            >
              既存のタグ{trimmed && `（「${trimmed}」を含むもの）`}
            </Typography>
            <Box
              sx={{
                maxHeight: 150,
                overflow: "auto",
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                my: 1,
              }}
            >
              {filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <Chip key={tag} label={`#${tag}`} size="small" />
                ))
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ p: 1 }}>
                  一致するタグはありません
                </Typography>
              )}
            </Box>
            <Divider sx={{ mb: 1 }} />
          </>
        )}

        <TextField
          autoFocus
          margin="dense"
          label="新しいタグ名"
          type="text"
          fullWidth
          variant="standard"
          placeholder="例: React"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={isDuplicate}
          helperText={
            isDuplicate ? "そのタグは既に存在します" : "先頭の「#」は不要です"
          }
          onKeyPress={(e) => {
            if (e.key === "Enter") handleSubmit();
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
