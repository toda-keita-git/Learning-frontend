import Chip from "@mui/material/Chip";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import { daysUntil, deadlineLabel } from "./deadline";

export default function DeadlineChip({ value }: { value: string | null }) {
  if (!value) return null;
  const days = daysUntil(value);
  return (
    <Chip
      icon={<EventOutlinedIcon fontSize="small" />}
      label={deadlineLabel(value)}
      size="small"
      color={days < 0 ? "error" : days <= 7 ? "warning" : "default"}
      variant={days <= 7 ? "filled" : "outlined"}
      sx={{ height: 24 }}
    />
  );
}
