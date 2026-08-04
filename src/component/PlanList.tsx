import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import type { Plan } from "./PlanTypes";
import { PLAN_STATUS_LABEL } from "./PlanTypes";
import ProgressBadge from "./ProgressBadge";

interface PlanListProps {
  plans: Plan[]; // 呼び出し側でsort_order昇順に並べ済みの、同じ親を持つ兄弟プラン
  onSelect: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onReorder: (orderedIds: number[]) => void;
  // 兄弟の1つの上にドロップ＝そのプランの子として再配置（目標⇄アクションプランの入れ替え）
  onReparent: (id: number, newParentId: number) => void;
  // 指定時、リスト先頭に「ルートへ戻す」ドロップゾーンを表示する（親を外して独立した目標にする）
  onPromoteToRoot?: (id: number) => void;
}

type DropHint = { kind: "row"; targetId: number; mode: "before" | "after" | "nest" } | { kind: "root" } | null;

const LONG_PRESS_MS = 220;
const MOVE_CANCEL_PX = 8;

export default function PlanList({ plans, onSelect, onEdit, onDelete, onReorder, onReparent, onPromoteToRoot }: PlanListProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);
  const longPressTimer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = (plan: Plan) => (e: ReactPointerEvent<HTMLDivElement>) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    longPressTimer.current = window.setTimeout(() => {
      setDraggingId(plan.id);
      target.setPointerCapture(pointerId);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startPos.current && draggingId === null) {
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        clearLongPress(); // 長押し確定前に動いた＝スクロール操作とみなしてドラッグ開始をキャンセル
      }
      return;
    }
    if (draggingId === null) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const rootZone = el?.closest('[data-drop-root="true"]');
    if (rootZone) {
      setDropHint({ kind: "root" });
      return;
    }
    const row = el?.closest("[data-plan-id]") as HTMLElement | null;
    if (!row) {
      setDropHint(null);
      return;
    }
    const targetId = Number(row.dataset.planId);
    if (targetId === draggingId) {
      setDropHint(null);
      return;
    }
    const rect = row.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    const mode: "before" | "after" | "nest" = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "nest";
    setDropHint({ kind: "row", targetId, mode });
  };

  const finishDrag = () => {
    clearLongPress();
    if (draggingId !== null && dropHint) {
      if (dropHint.kind === "root") {
        onPromoteToRoot?.(draggingId);
      } else if (dropHint.mode === "nest") {
        onReparent(draggingId, dropHint.targetId);
      } else {
        const ids = plans.map((p) => p.id);
        const fromIndex = ids.indexOf(draggingId);
        if (fromIndex !== -1) {
          ids.splice(fromIndex, 1);
          const toIndex = ids.indexOf(dropHint.targetId);
          const insertAt = dropHint.mode === "before" ? toIndex : toIndex + 1;
          ids.splice(insertAt, 0, draggingId);
          onReorder(ids);
        }
      }
    }
    setDraggingId(null);
    setDropHint(null);
    startPos.current = null;
  };

  if (plans.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        まだプランがありません。
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {onPromoteToRoot && draggingId !== null && (
        <Paper
          data-drop-root="true"
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2,
            borderStyle: "dashed",
            textAlign: "center",
            color: "text.secondary",
            borderColor: dropHint?.kind === "root" ? "primary.main" : "divider",
            bgcolor: dropHint?.kind === "root" ? "action.hover" : "transparent",
          }}
        >
          <VerticalAlignTopIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
          ここにドロップでルート（独立した目標）に戻す
        </Paper>
      )}
      {plans.map((plan) => (
        <Paper
          key={plan.id}
          data-plan-id={plan.id}
          variant="outlined"
          onPointerDown={handlePointerDown(plan)}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          sx={{
            p: 1.5,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "grab",
            touchAction: draggingId !== null ? "none" : "auto",
            opacity: draggingId === plan.id ? 0.4 : 1,
            outline: dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "nest" ? "2px solid" : "none",
            outlineColor: "primary.main",
            borderTop: dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "before" ? "3px solid" : undefined,
            borderTopColor: "primary.main",
            borderBottom: dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "after" ? "3px solid" : undefined,
            borderBottomColor: "primary.main",
          }}
        >
          <DragIndicatorIcon fontSize="small" sx={{ color: "text.disabled" }} />

          <Stack sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => draggingId === null && onSelect(plan)}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 600 }} noWrap>
                {plan.title}
              </Typography>
              <Chip label={PLAN_STATUS_LABEL[plan.status]} size="small" variant="outlined" />
            </Stack>
            <ProgressBadge value={plan.progress} />
          </Stack>

          <IconButton size="small" onClick={() => onEdit(plan)} aria-label="編集">
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(plan)} aria-label="削除">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onSelect(plan)} aria-label="開く">
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Paper>
      ))}
    </Stack>
  );
}
