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
import Alert from "@mui/material/Alert";
import type { Plan, PlanInput, PlanStatus } from "./PlanTypes";
import { PLAN_STATUS_LABEL } from "./PlanTypes";

interface PlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PlanInput) => Promise<void>;
  // 新規作成時の親（nullならルート＝目標として作成）。編集時は既存のparent_idを維持する
  parentId: number | null;
  parentTitle?: string | null;
  initialPlan?: Plan | null;
  // メモをドラッグして新規作成した場合に、作成後そのメモをリンクする旨を案内する
  linkingNoteTitle?: string | null;
  // カレンダーの日付をタップして作成した場合に、その日を期限日の初期値にする（新規作成時のみ）
  initialDueDate?: string | null;
}

export default function PlanFormDialog({
  open,
  onClose,
  onSubmit,
  parentId,
  parentTitle,
  initialPlan,
  linkingNoteTitle,
  initialDueDate,
}: PlanFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PlanStatus>("not_started");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // メモをドラッグして作成する場合は、タイピングを減らせるようメモのタイトルを初期値にしておく
    setTitle(initialPlan?.title ?? linkingNoteTitle ?? "");
    setDescription(initialPlan?.description ?? "");
    setStatus(initialPlan?.status ?? "not_started");
    setStartDate(initialPlan?.start_date ?? "");
    setDueDate(initialPlan?.due_date ?? (initialPlan ? "" : initialDueDate ?? ""));
  }, [open, initialPlan, linkingNoteTitle, initialDueDate]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        parent_id: initialPlan ? initialPlan.parent_id : parentId,
        title: title.trim(),
        description: description.trim() || null,
        status,
        start_date: startDate || null,
        due_date: dueDate || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isRoot = initialPlan ? initialPlan.parent_id === null : parentId === null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialPlan ? "プランを編集" : isRoot ? "新しい目標" : `「${parentTitle ?? ""}」の下にアクションプランを追加`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {linkingNoteTitle && (
            <Alert severity="info" variant="outlined">
              作成すると、メモ「{linkingNoteTitle}」がこのプランにリンクされます。
            </Alert>
          )}
          <TextField
            label={isRoot ? "目標名" : "アクションプラン名"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            autoFocus
            placeholder={isRoot ? "例: React の状態管理を体系的に理解する" : "例: 公式ドキュメントを読む"}
          />
          <TextField
            label="説明（任意）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              type="date"
              label="開始日（任意）"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              type="date"
              label="期限日（任意）"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: startDate || undefined } }}
              error={!!startDate && !!dueDate && dueDate < startDate}
              helperText={startDate && dueDate && dueDate < startDate ? "開始日以降を選択してください" : " "}
              fullWidth
            />
          </Stack>
          {initialPlan && (
            <TextField
              select
              label="状態"
              value={status}
              onChange={(e) => setStatus(e.target.value as PlanStatus)}
              fullWidth
            >
              {(Object.keys(PLAN_STATUS_LABEL) as PlanStatus[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {PLAN_STATUS_LABEL[s]}
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
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !title.trim() || (!!startDate && !!dueDate && dueDate < startDate)}
        >
          {saving ? <CircularProgress size={20} /> : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
