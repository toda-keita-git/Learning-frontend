import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import NoteCard from "./NoteCard";
import type { Note } from "./PlanTypes";
import type { PlanOption } from "./PlanPicker";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface NotePreviewDialogProps {
  // 開いていないときはnull。表示中にメモが更新されたら中身も追従させたいので、
  // ダイアログ側で控えを持たず、常に最新のメモを親から受け取る
  note: Note | null;
  onClose: () => void;
  planOptions: PlanOption[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onToggleTodo: (todoItemId: number, checked: boolean) => void;
  onLink: (note: Note, planId: number) => void;
  onUnlink: (note: Note, planId: number) => void;
}

// メモトレイの行をタップしたときに開く、メモの内容表示。
// トレイの行はタイトルしか出ないため、本文・チェックリスト・添付・紐づくプランを
// 確認する場所が無かった。表示はメモライブラリと同じNoteCardをそのまま使い、
// 「ライブラリで見たときと同じ見た目・同じ操作」になるようにしている
export default function NotePreviewDialog({
  note,
  onClose,
  planOptions,
  onEdit,
  onDelete,
  onToggleTodo,
  onLink,
  onUnlink,
}: NotePreviewDialogProps) {
  const fullScreenDialog = useFullScreenDialog();

  return (
    <Dialog open={!!note} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ArticleOutlinedIcon color="primary" />
        メモの内容
      </DialogTitle>
      <DialogContent dividers>
        {note && (
          // NoteCard自身が枠線付きのPaperなので、ダイアログ側の余白は最小限にする
          <Box sx={{ py: 0.5 }}>
            <NoteCard
              note={note}
              planOptions={planOptions}
              onEdit={() => onEdit(note)}
              onDelete={() => onDelete(note)}
              onToggleTodo={onToggleTodo}
              onLink={(planId) => onLink(note, planId)}
              onUnlink={(planId) => onUnlink(note, planId)}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
