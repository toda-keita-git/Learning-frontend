import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { DragHintKind } from "./dragVisuals";
import { DRAG_COLOR, DRAG_HINT_TEXT } from "./dragVisuals";

interface DragHintTooltipProps {
  kind: DragHintKind;
  x: number;
  y: number;
}

// ドラッグ中、指のすぐそばに「今どの操作になるか」を表示する浮遊ラベル。
// ドロップ先ごとのルールを覚えなくても、動かしながら見れば分かるようにする
export default function DragHintTooltip({ kind, x, y }: DragHintTooltipProps) {
  if (!kind) return null;
  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        left: x + 16,
        top: y + 16,
        zIndex: (t) => t.zIndex.tooltip,
        px: 1.25,
        py: 0.5,
        borderRadius: 5,
        pointerEvents: "none",
        border: "2px solid",
        borderColor: DRAG_COLOR[kind],
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: DRAG_COLOR[kind] }}>
        {DRAG_HINT_TEXT[kind]}
      </Typography>
    </Paper>
  );
}
