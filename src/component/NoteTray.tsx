import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import type { Note } from "./PlanTypes";
import { NOTE_TYPE_LABEL } from "./PlanTypes";
import { NOTE_TYPE_COLOR, NOTE_TYPE_BORDER_COLOR } from "./noteVisuals";
import DragHintTooltip from "./DragHintTooltip";
import { maybeAutoScrollWindow } from "./dragAutoScroll";

interface NoteTrayProps {
  notes: Note[];
  onLinkNote: (note: Note, planId: number) => void;
  onCreatePlanFromNote: (note: Note) => void;
  // ボード側のUI（新規プラン作成ゾーンの表示・プラン行のハイライト）を連動させるための通知
  onDraggingChange?: (draggingNoteId: number | null) => void;
  onHoverPlanChange?: (planId: number | null) => void;
  onHoverCreateZoneChange?: (hovering: boolean) => void;
}

const LONG_PRESS_MS = 220;
const MOVE_CANCEL_PX = 8;

type DropTarget = { kind: "plan"; planId: number } | { kind: "create" } | null;

// 「プラン」タブなら常にどこからでも開ける、常設のメモトレイ。折りたたんでいても
// 存在は分かるようにし、展開すればどのメモも指で持ち上げてプラン行や新規作成ゾーンへドラッグできる。
// PlanTreeのプランドラッグと同じく、つまみ不要で長押し開始→transform追従の自己完結型エンジンを持つ
export default function NoteTray({
  notes,
  onLinkNote,
  onCreatePlanFromNote,
  onDraggingChange,
  onHoverPlanChange,
  onHoverCreateZoneChange,
}: NoteTrayProps) {
  const [expanded, setExpanded] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const longPressTimer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const dropTargetRef = useRef<DropTarget>(null);

  const setCardRef = (id: number) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  const applyDragVisual = (id: number, dx: number, dy: number) => {
    const el = cardRefs.current.get(id);
    if (!el) return;
    el.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
    el.style.zIndex = "10";
    el.style.boxShadow = "0 10px 24px rgba(0,0,0,0.25)";
    el.style.pointerEvents = "none";
  };

  const clearDragVisual = (id: number) => {
    const el = cardRefs.current.get(id);
    if (!el) return;
    el.style.transform = "";
    el.style.zIndex = "";
    el.style.boxShadow = "";
    el.style.pointerEvents = "";
  };

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const updateDropTarget = (next: DropTarget) => {
    const prev = dropTargetRef.current;
    const same =
      prev === next ||
      (prev?.kind === "plan" && next?.kind === "plan" && prev.planId === next.planId) ||
      (prev?.kind === "create" && next?.kind === "create");
    if (same) return;
    dropTargetRef.current = next;
    setDropTarget(next);
    onHoverPlanChange?.(next?.kind === "plan" ? next.planId : null);
    onHoverCreateZoneChange?.(next?.kind === "create");
  };

  const processMove = () => {
    rafId.current = null;
    const point = pendingPoint.current;
    const origin = dragOrigin.current;
    const id = draggingIdRef.current;
    if (!point || !origin || id === null) return;

    applyDragVisual(id, point.x - origin.x, point.y - origin.y);
    maybeAutoScrollWindow(point.y);

    const hitEl = document.elementFromPoint(point.x, point.y);
    if (hitEl?.closest('[data-drop-create-plan="true"]')) {
      updateDropTarget({ kind: "create" });
      return;
    }
    const row = hitEl?.closest("[data-plan-id]") as HTMLElement | null;
    if (row) {
      updateDropTarget({ kind: "plan", planId: Number(row.dataset.planId) });
      return;
    }
    updateDropTarget(null);
  };

  const finishDrag = () => {
    clearLongPress();
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    const id = draggingIdRef.current;
    const target = dropTargetRef.current;
    if (id !== null) {
      clearDragVisual(id);
      const note = notes.find((n) => n.id === id);
      if (note && target) {
        if (target.kind === "create") {
          onCreatePlanFromNote(note);
        } else if (!note.links.includes(target.planId)) {
          onLinkNote(note, target.planId);
        }
      }
    }
    dragOrigin.current = null;
    pendingPoint.current = null;
    draggingIdRef.current = null;
    dropTargetRef.current = null;
    startPos.current = null;
    setDraggingId(null);
    setDropTarget(null);
    setPointer(null);
    onDraggingChange?.(null);
    onHoverPlanChange?.(null);
    onHoverCreateZoneChange?.(false);
  };

  const handlePointerDown = (note: Note) => (e: ReactPointerEvent<HTMLDivElement>) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    const origin = { x: e.clientX, y: e.clientY };
    longPressTimer.current = window.setTimeout(() => {
      dragOrigin.current = origin;
      draggingIdRef.current = note.id;
      setDraggingId(note.id);
      setPointer(origin);
      onDraggingChange?.(note.id);
      target.setPointerCapture(pointerId);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startPos.current && draggingIdRef.current === null) {
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearLongPress();
      return;
    }
    if (draggingIdRef.current === null) return;
    pendingPoint.current = { x: e.clientX, y: e.clientY };
    setPointer({ x: e.clientX, y: e.clientY });
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(processMove);
    }
  };

  const hintKind = dropTarget?.kind === "create" ? "create" : dropTarget?.kind === "plan" ? "link" : null;

  return (
    <Paper
      elevation={4}
      sx={{
        position: "sticky",
        bottom: 56,
        borderRadius: 0,
        borderTop: "1px solid",
        borderColor: "divider",
        zIndex: (t) => t.zIndex.appBar - 1,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1, cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <DescriptionOutlinedIcon fontSize="small" color="action" />
        <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
          メモトレイ（{notes.length}件・指で持ち上げてプランへ）
        </Typography>
        <IconButton size="small" aria-label={expanded ? "閉じる" : "開く"}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>
      {expanded && (
        <Box sx={{ display: "flex", gap: 1.25, overflowX: "auto", px: 1.5, pb: 1.5 }}>
          {notes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              メモがありません。
            </Typography>
          ) : (
            notes.map((note) => (
              <Paper
                key={note.id}
                ref={setCardRef(note.id)}
                data-note-tray-item="true"
                variant="outlined"
                onPointerDown={handlePointerDown(note)}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                sx={{
                  p: 1.25,
                  minWidth: 180,
                  maxWidth: 180,
                  borderRadius: 2,
                  borderLeftWidth: 3,
                  borderLeftStyle: "solid",
                  borderLeftColor: NOTE_TYPE_BORDER_COLOR[note.type],
                  cursor: "grab",
                  touchAction: "none",
                  willChange: "transform",
                  opacity: draggingId === note.id ? 0.9 : 1,
                  flexShrink: 0,
                }}
              >
                <Chip label={NOTE_TYPE_LABEL[note.type]} size="small" color={NOTE_TYPE_COLOR[note.type]} variant="outlined" sx={{ mb: 0.5 }} />
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {note.title}
                </Typography>
              </Paper>
            ))
          )}
        </Box>
      )}

      {pointer && <DragHintTooltip kind={hintKind} x={pointer.x} y={pointer.y} />}
    </Paper>
  );
}
