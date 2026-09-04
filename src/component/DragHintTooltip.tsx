import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { DragHintKind } from "./dragVisuals";
import { DRAG_COLOR, DRAG_HINT_TEXT } from "./dragVisuals";

interface DragHintTooltipProps {
  kind: DragHintKind;
  x: number;
  y: number;
}

// ドラッグ中、「今どの操作になるか」を表示する浮遊ラベル。
// ドロップ先ごとのルールを覚えなくても、動かしながら見れば分かるようにする。
//
// 指で操作している場合は、指に追従させない。指と手そのものがラベルを覆ううえ、
// 指の右下に出すと、まさに今ドロップ先として見比べたい行の文字に重なってしまう。
// 画面の端に固定して、常に同じ場所で読めるようにする。
// マウスの場合はカーソルが小さく手で隠れることもないため、従来どおり追従させる
export default function DragHintTooltip({ kind, x, y }: DragHintTooltipProps) {
  const isTouch = useMediaQuery("(pointer: coarse)");
  if (!kind) return null;

  // マウス時、カーソルが画面右側にあるとラベルが画面外へはみ出すため、
  // その場合だけカーソルの左側に出す
  const flipToLeft = !isTouch && typeof window !== "undefined" && x > window.innerWidth / 2;

  const position = isTouch
    ? {
        // ドラッグ中は画面の上下に固定の案内が出る（上=「ルートに戻す」バナーと
        // 「新しい目標を作成」ゾーン、下=メモトレイとフッターナビ）。
        // どちらとも重ならないのは最上部だけなので、ヘッダーに重ねて置く。
        // ヘッダーはアプリ名とボタンだけで、ドラッグ中に読む必要がない
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
      }
    : {
        top: y + 16,
        ...(flipToLeft
          ? { right: window.innerWidth - x + 16 }
          : { left: x + 16 }),
      };

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        ...position,
        zIndex: (t) => t.zIndex.tooltip,
        px: 1.25,
        py: 0.5,
        borderRadius: 5,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        maxWidth: "calc(100vw - 32px)",
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
