import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Box from "@mui/material/Box";
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

const sameHint = (a: DropHint, b: DropHint) => {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "row" && b.kind === "row") return a.targetId === b.targetId && a.mode === b.mode;
  return true;
};

// ハンドル（つまみアイコン）をつかんだ瞬間に即ドラッグ開始する。長押し待ちは行わず、
// 指の動きにdata-plan-idの行をtransformで直接追従させることで「ぬるぬる」動く体感にする
export default function PlanList({ plans, onSelect, onEdit, onDelete, onReorder, onReparent, onPromoteToRoot }: PlanListProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const dropHintRef = useRef<DropHint>(null);

  const setRowRef = (id: number) => (el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };

  const applyDragVisual = (id: number, dy: number) => {
    const el = rowRefs.current.get(id);
    if (!el) return;
    el.style.transform = `translateY(${dy}px) scale(1.02)`;
    el.style.zIndex = "10";
    el.style.boxShadow = "0 10px 24px rgba(0,0,0,0.22)";
    el.style.pointerEvents = "none";
  };

  const clearDragVisual = (id: number) => {
    const el = rowRefs.current.get(id);
    if (!el) return;
    el.style.transform = "";
    el.style.zIndex = "";
    el.style.boxShadow = "";
    el.style.pointerEvents = "";
  };

  const updateDropHint = (next: DropHint) => {
    if (sameHint(dropHintRef.current, next)) return;
    dropHintRef.current = next;
    setDropHint(next);
  };

  const processMove = () => {
    rafId.current = null;
    const point = pendingPoint.current;
    const origin = dragOrigin.current;
    const id = draggingIdRef.current;
    if (!point || !origin || id === null) return;

    applyDragVisual(id, point.y - origin.y);

    const hitEl = document.elementFromPoint(point.x, point.y);
    const rootZone = hitEl?.closest('[data-drop-root="true"]');
    if (rootZone) {
      updateDropHint({ kind: "root" });
      return;
    }
    const row = hitEl?.closest("[data-plan-id]") as HTMLElement | null;
    if (!row) {
      updateDropHint(null);
      return;
    }
    const targetId = Number(row.dataset.planId);
    if (targetId === id) {
      updateDropHint(null);
      return;
    }
    const rect = row.getBoundingClientRect();
    const relY = (point.y - rect.top) / rect.height;
    const mode: "before" | "after" | "nest" = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "nest";
    updateDropHint({ kind: "row", targetId, mode });
  };

  const handleHandlePointerDown = (plan: Plan) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    draggingIdRef.current = plan.id;
    dropHintRef.current = null;
    setDraggingId(plan.id);
    setDropHint(null);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingIdRef.current === null) return;
    pendingPoint.current = { x: e.clientX, y: e.clientY };
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(processMove);
    }
  };

  const finishDrag = () => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    const id = draggingIdRef.current;
    const hint = dropHintRef.current;
    if (id !== null) {
      clearDragVisual(id);
      if (hint) {
        if (hint.kind === "root") {
          onPromoteToRoot?.(id);
        } else if (hint.mode === "nest") {
          onReparent(id, hint.targetId);
        } else {
          const ids = plans.map((p) => p.id);
          const fromIndex = ids.indexOf(id);
          if (fromIndex !== -1) {
            ids.splice(fromIndex, 1);
            const toIndex = ids.indexOf(hint.targetId);
            const insertAt = hint.mode === "before" ? toIndex : toIndex + 1;
            ids.splice(insertAt, 0, id);
            onReorder(ids);
          }
        }
      }
    }
    dragOrigin.current = null;
    pendingPoint.current = null;
    draggingIdRef.current = null;
    dropHintRef.current = null;
    setDraggingId(null);
    setDropHint(null);
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
          ref={setRowRef(plan.id)}
          data-plan-id={plan.id}
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            transition: draggingId === plan.id ? "none" : "box-shadow .15s",
            willChange: "transform",
            outline: dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "nest" ? "2px solid" : "none",
            outlineColor: "primary.main",
            borderTop: dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "before" ? "3px solid" : undefined,
            borderTopColor: "primary.main",
            borderBottom: dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "after" ? "3px solid" : undefined,
            borderBottomColor: "primary.main",
          }}
        >
          <Box
            data-drag-handle="true"
            onPointerDown={handleHandlePointerDown(plan)}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 1,
              cursor: "grab",
              touchAction: "none",
              "&:active": { cursor: "grabbing", bgcolor: "action.hover" },
            }}
          >
            <DragIndicatorIcon fontSize="small" sx={{ color: "text.disabled" }} />
          </Box>

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
