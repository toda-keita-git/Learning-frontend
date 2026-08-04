import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import type { ActionPlanOption } from "./NoteFormDialog";

interface AttachNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (actionPlanId: number) => Promise<void>;
  actionPlanOptions: ActionPlanOption[];
}

// 未紐付けメモを後からアクションプランに紐付けるための選択ダイアログ
export default function AttachNoteDialog({ open, onClose, onConfirm, actionPlanOptions }: AttachNoteDialogProps) {
  const [selected, setSelected] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (selected === "") return;
    setSaving(true);
    try {
      await onConfirm(Number(selected));
      setSelected("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>アクションプランに紐付ける</DialogTitle>
      <DialogContent>
        <TextField
          select
          label="アクションプラン"
          value={selected}
          onChange={(e) => setSelected(e.target.value === "" ? "" : Number(e.target.value))}
          fullWidth
          sx={{ mt: 1 }}
        >
          {actionPlanOptions.length === 0 && (
            <MenuItem value="" disabled>
              紐付け先のアクションプランがありません
            </MenuItem>
          )}
          {actionPlanOptions.map((opt) => (
            <MenuItem key={opt.id} value={opt.id}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={saving || selected === ""}>
          {saving ? <CircularProgress size={20} /> : "紐付ける"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
