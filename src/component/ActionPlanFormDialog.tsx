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
import type { ActionPlan, ActionPlanInput, ActionPlanStatus } from "./GoalTypes";
import { ACTION_PLAN_STATUS_LABEL } from "./GoalTypes";

interface ActionPlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ActionPlanInput) => Promise<void>;
  goalId: number;
  initialActionPlan?: ActionPlan | null;
}

export default function ActionPlanFormDialog({
  open,
  onClose,
  onSubmit,
  goalId,
  initialActionPlan,
}: ActionPlanFormDialogProps) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ActionPlanStatus>("not_started");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialActionPlan?.title ?? "");
    setStatus(initialActionPlan?.status ?? "not_started");
  }, [open, initialActionPlan]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ goal_id: goalId, title: title.trim(), status });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialActionPlan ? "アクションプランを編集" : "新しいアクションプラン"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="アクションプラン名"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            autoFocus
            placeholder="例: 週1回、学習内容をアウトプットする"
          />
          {initialActionPlan && (
            <TextField
              select
              label="状態"
              value={status}
              onChange={(e) => setStatus(e.target.value as ActionPlanStatus)}
              fullWidth
            >
              {(Object.keys(ACTION_PLAN_STATUS_LABEL) as ActionPlanStatus[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {ACTION_PLAN_STATUS_LABEL[s]}
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
