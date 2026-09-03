import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useFullScreenDialog } from "./useFullScreenDialog";
import type { RestDayConfig } from "./restDays";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

interface RestDaySettingsDialogProps {
  open: boolean;
  config: RestDayConfig;
  onClose: () => void;
  onSave: (config: RestDayConfig) => void;
}

// 「休み」の色を付ける条件を、曜日・祝日・個別の日付で決める設定画面。
// 土日休みとは限らないため、既定値をそのまま押し付けずに変えられるようにする
export default function RestDaySettingsDialog({ open, config, onClose, onSave }: RestDaySettingsDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  const [draft, setDraft] = useState<RestDayConfig>(config);
  const [dateInput, setDateInput] = useState("");
  const [workDateInput, setWorkDateInput] = useState("");

  const addDate = (kind: "extraDates" | "workDates", value: string) => {
    if (!value || draft[kind].includes(value)) return;
    setDraft({ ...draft, [kind]: [...draft[kind], value].sort() });
  };
  const removeDate = (kind: "extraDates" | "workDates", value: string) => {
    setDraft({ ...draft, [kind]: draft[kind].filter((d) => d !== value) });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle>休みの設定</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              休みにする曜日
            </Typography>
            <ToggleButtonGroup
              value={draft.weekdays}
              onChange={(_, value: number[]) => setDraft({ ...draft, weekdays: value })}
              size="small"
              sx={{ display: "flex", width: "100%" }}
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <ToggleButton key={label} value={index} sx={{ flex: 1, px: 0, minWidth: 0 }}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={draft.useHolidays}
                onChange={(e) => setDraft({ ...draft, useHolidays: e.target.checked })}
              />
            }
            label="日本の祝日も休みにする"
          />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              休みにする日を追加
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              有給や独自の休みなど、曜日では表せない日を指定できます。
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                type="date"
                size="small"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={() => {
                  addDate("extraDates", dateInput);
                  setDateInput("");
                }}
                disabled={!dateInput}
              >
                追加
              </Button>
            </Stack>
            {draft.extraDates.length > 0 && (
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                {draft.extraDates.map((d) => (
                  <Chip key={d} label={d} size="small" onDelete={() => removeDate("extraDates", d)} />
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              休みから外す日
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              土日や祝日でも、その日だけ休みにしない場合に指定します。
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                type="date"
                size="small"
                value={workDateInput}
                onChange={(e) => setWorkDateInput(e.target.value)}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={() => {
                  addDate("workDates", workDateInput);
                  setWorkDateInput("");
                }}
                disabled={!workDateInput}
              >
                追加
              </Button>
            </Stack>
            {draft.workDates.length > 0 && (
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                {draft.workDates.map((d) => (
                  <Chip key={d} label={d} size="small" onDelete={() => removeDate("workDates", d)} />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={() => onSave(draft)}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
