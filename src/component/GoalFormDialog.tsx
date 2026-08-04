import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import type { Goal, GoalInput, GoalStatus } from "./GoalTypes";
import { GOAL_STATUS_LABEL } from "./GoalTypes";

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GoalInput) => Promise<void>;
  initialGoal?: Goal | null;
}

export default function GoalFormDialog({ open, onClose, onSubmit, initialGoal }: GoalFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>("in_progress");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialGoal?.title ?? "");
    setDescription(initialGoal?.description ?? "");
    setStatus(initialGoal?.status ?? "in_progress");
  }, [open, initialGoal]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || null, status });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialGoal ? "目標を編集" : "新しい目標"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="目標名"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            autoFocus
            placeholder="例: React の状態管理を体系的に理解する"
          />
          <TextField
            label="なぜこの目標なのか（任意）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          {initialGoal && (
            <TextField
              select
              label="状態"
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
              fullWidth
            >
              {(Object.keys(GOAL_STATUS_LABEL) as GoalStatus[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {GOAL_STATUS_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !title.trim()}>
          {saving ? <CircularProgress size={20} /> : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
