import { useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import type { PlanOption } from "./PlanPicker";

interface PlanSelectDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: PlanOption[];
  onSelect: (planId: number) => void;
  // 一覧から選ぶ以外の逃げ道を1つだけ添えたいとき用（例: メモから新しいプランを作る）。
  // 省略時は今まで通りキャンセルだけが並ぶ
  extraActionLabel?: string;
  onExtraAction?: () => void;
  // 候補が空のときに出す案内文（省略時は検索結果なしと同じ文言）
  emptyText?: string;
}

// ドラッグ操作の代わりに、検索して選ぶだけでプランの移動先を指定できるダイアログ。
// PlanTreeの「⋮」メニューから開き、ドラッグができない・やりにくい環境でも
// 同じ操作（別プランへ移動／ルートにする）をキーボード・タップだけで行えるようにする
export default function PlanSelectDialog({
  open,
  onClose,
  title,
  options,
  onSelect,
  extraActionLabel,
  onExtraAction,
  emptyText,
}: PlanSelectDialogProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="プランを検索…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Stack sx={{ maxHeight: 320, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                {options.length === 0 && emptyText ? emptyText : "見つかりませんでした。"}
              </Typography>
            ) : (
              filtered.map((opt) => (
                <ButtonBase
                  key={opt.id}
                  onClick={() => {
                    onSelect(opt.id);
                    onClose();
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    py: 1,
                    px: 1,
                    borderRadius: 1,
                    textAlign: "left",
                    justifyContent: "flex-start",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <FlagOutlinedIcon fontSize="small" color="action" />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {opt.label}
                  </Typography>
                </ButtonBase>
              ))
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {extraActionLabel && onExtraAction && (
          <Button
            onClick={() => {
              onExtraAction();
              onClose();
            }}
            sx={{ mr: "auto" }}
          >
            {extraActionLabel}
          </Button>
        )}
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
}
