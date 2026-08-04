import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import type { Plan } from "./PlanTypes";
import { PLAN_STATUS_LABEL } from "./PlanTypes";
import ProgressBadge from "./ProgressBadge";
import DragHintTooltip from "./DragHintTooltip";
import { DRAG_COLOR } from "./dragVisuals";
import type { DragHintKind } from "./dragVisuals";
import { maybeAutoScrollWindow } from "./dragAutoScroll";

interface PlanTreeProps {
  plans: Plan[]; // 全プラン（達成率算出済み）。深さに関わらず、再帰表示に必要な全レベルを渡す
  // このidを親に持つプランたちを深さ0として表示する（メイン画面ではnull＝ルート、プラン詳細ではそのプランのid）
  rootParentId: number | null;
  isExpanded: (id: number) => boolean;
  onToggleExpand: (id: number) => void;
  onSelect: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  // 兄弟をまたいだドロップも含め、判断は呼び出し側（全プランを知っている）に任せる
  onDrop: (draggedId: number, targetId: number, mode: "before" | "after" | "nest") => void;
  onPromoteToRoot?: (id: number) => void;
  // メモトレイからのドラッグ中、どの行の上にいるかを外から伝えてハイライトさせる
  noteDropHighlightId?: number | null;
  // ドラッグができない・やりにくい環境向けの代替操作（「⋮」メニュー）
  onMoveSibling?: (plan: Plan, direction: "up" | "down") => void;
  onOpenReparentPicker?: (plan: Plan) => void;
}

type DropHint = { kind: "row"; targetId: number; mode: "before" | "after" | "nest" } | { kind: "root" } | null;

const sameHint = (a: DropHint, b: DropHint) => {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "row" && b.kind === "row") return a.targetId === b.targetId && a.mode === b.mode;
  return true;
};

const hintKind = (hint: DropHint): DragHintKind => {
  if (!hint) return null;
  if (hint.kind === "root") return "promote";
  return hint.mode === "nest" ? "nest" : "reorder";
};

// アプリ全体の「統合ボード」を構成する再帰ツリー。目標・アクションプランを1画面に並べ、
// つまみを掴んだ瞬間に即ドラッグ開始→transform追従（ぬるぬる動く）→どの行にドロップしても
// 兄弟をまたいで再配置できる。プラン詳細画面の「子プラン」表示にもrootParentIdを変えて再利用する
export default function PlanTree({
  plans,
  rootParentId,
  isExpanded,
  onToggleExpand,
  onSelect,
  onEdit,
  onDelete,
  onDrop,
  onPromoteToRoot,
  noteDropHighlightId,
  onMoveSibling,
  onOpenReparentPicker,
}: PlanTreeProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [menuState, setMenuState] = useState<{ plan: Plan; anchorEl: HTMLElement } | null>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const dropHintRef = useRef<DropHint>(null);

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, Plan[]>();
    for (const plan of plans) {
      const list = map.get(plan.parent_id) ?? [];
      list.push(plan);
      map.set(plan.parent_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [plans]);

  const menuSiblingIndex = (plan: Plan): [number, boolean, boolean] => {
    const siblings = childrenByParent.get(plan.parent_id) ?? [];
    const idx = siblings.findIndex((p) => p.id === plan.id);
    return [idx, idx > 0, idx !== -1 && idx < siblings.length - 1];
  };

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
    maybeAutoScrollWindow(point.y);

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
    setPointer({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingIdRef.current === null) return;
    pendingPoint.current = { x: e.clientX, y: e.clientY };
    setPointer({ x: e.clientX, y: e.clientY });
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
        } else {
          onDrop(id, hint.targetId, hint.mode);
        }
      }
    }
    dragOrigin.current = null;
    pendingPoint.current = null;
    draggingIdRef.current = null;
    dropHintRef.current = null;
    setDraggingId(null);
    setDropHint(null);
    setPointer(null);
  };

  const renderNode = (plan: Plan, depth: number) => {
    const children = childrenByParent.get(plan.id) ?? [];
    const hasChildren = children.length > 0;
    const expanded = isExpanded(plan.id);
    const isGoal = depth === 0;
    const nestHighlight = dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "nest";
    const beforeHighlight = dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "before";
    const afterHighlight = dropHint?.kind === "row" && dropHint.targetId === plan.id && dropHint.mode === "after";
    const noteHighlight = noteDropHighlightId === plan.id;

    return (
      <Box key={plan.id} sx={{ ml: depth === 0 ? 0 : 2.5 }}>
        <Paper
          ref={setRowRef(plan.id)}
          data-plan-id={plan.id}
          variant="outlined"
          sx={{
            p: isGoal ? 1.5 : 1,
            mb: 1,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            borderWidth: isGoal ? 2 : 1,
            willChange: "transform",
            outline: nestHighlight || noteHighlight ? "2px solid" : "none",
            outlineColor: noteHighlight ? DRAG_COLOR.link : DRAG_COLOR.nest,
            bgcolor: noteHighlight ? (t) => (t.palette.mode === "dark" ? "rgba(46,125,50,0.25)" : "rgba(46,125,50,0.08)") : undefined,
            borderTop: beforeHighlight ? "3px solid" : undefined,
            borderTopColor: DRAG_COLOR.reorder,
            borderBottom: afterHighlight ? "3px solid" : undefined,
            borderBottomColor: DRAG_COLOR.reorder,
          }}
        >
          {hasChildren ? (
            <IconButton size="small" onClick={() => onToggleExpand(plan.id)} aria-label={expanded ? "折りたたむ" : "展開する"}>
              <ExpandMoreIcon
                fontSize="small"
                sx={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s" }}
              />
            </IconButton>
          ) : (
            <Box sx={{ width: 32 }} />
          )}

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

          {isGoal ? (
            <FlagOutlinedIcon fontSize="small" color="primary" />
          ) : (
            <FiberManualRecordIcon sx={{ fontSize: 8, color: "text.disabled" }} />
          )}

          <Stack sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => draggingId === null && onSelect(plan)}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: isGoal ? 700 : 600 }} variant={isGoal ? "body1" : "body2"} noWrap>
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
          <IconButton
            size="small"
            onClick={(e) => setMenuState({ plan, anchorEl: e.currentTarget })}
            aria-label="その他の操作"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Paper>

        {hasChildren && expanded && (
          <Box sx={{ borderLeft: "1px dashed", borderColor: "divider", pl: 0 }}>
            {children.map((child) => renderNode(child, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const roots = childrenByParent.get(rootParentId) ?? [];

  return (
    <Box>
      {onPromoteToRoot && draggingId !== null && (
        // position:fixedのオーバーレイにして通常のレイアウトフローに参加させない。
        // ドラッグ開始時にここを通常のリストの先頭へ挿入すると、他の行が下にずれて
        // ドラッグ開始直後のヒットテスト座標がずれてしまう（ドロップ先の誤判定の原因になる）
        <Paper
          data-drop-root="true"
          variant="outlined"
          sx={{
            position: "fixed",
            top: 72,
            left: 16,
            right: 16,
            maxWidth: 600,
            mx: "auto",
            zIndex: (t) => t.zIndex.appBar + 1,
            p: 1.5,
            borderRadius: 2,
            borderStyle: "dashed",
            textAlign: "center",
            color: "text.secondary",
            borderColor: dropHint?.kind === "root" ? DRAG_COLOR.promote : "divider",
            bgcolor: dropHint?.kind === "root" ? "action.hover" : "background.paper",
            boxShadow: 3,
          }}
        >
          <VerticalAlignTopIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
          ここにドロップでルート（独立した目標）に戻す
        </Paper>
      )}

      {roots.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          まだプランがありません。
        </Typography>
      ) : (
        roots.map((plan) => renderNode(plan, 0))
      )}

      {pointer && <DragHintTooltip kind={hintKind(dropHint)} x={pointer.x} y={pointer.y} />}

      <Menu anchorEl={menuState?.anchorEl} open={!!menuState} onClose={() => setMenuState(null)}>
        {menuState && [
          <MenuItem
            key="open"
            onClick={() => {
              onSelect(menuState.plan);
              setMenuState(null);
            }}
          >
            <ListItemIcon>
              <ChevronRightIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>開く</ListItemText>
          </MenuItem>,
          <MenuItem
            key="up"
            disabled={!menuSiblingIndex(menuState.plan)[1]}
            onClick={() => {
              onMoveSibling?.(menuState.plan, "up");
              setMenuState(null);
            }}
          >
            <ListItemIcon>
              <ArrowUpwardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>上へ移動</ListItemText>
          </MenuItem>,
          <MenuItem
            key="down"
            disabled={!menuSiblingIndex(menuState.plan)[2]}
            onClick={() => {
              onMoveSibling?.(menuState.plan, "down");
              setMenuState(null);
            }}
          >
            <ListItemIcon>
              <ArrowDownwardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>下へ移動</ListItemText>
          </MenuItem>,
          <MenuItem
            key="reparent"
            onClick={() => {
              onOpenReparentPicker?.(menuState.plan);
              setMenuState(null);
            }}
          >
            <ListItemIcon>
              <DriveFileMoveOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>別のプランへ移動…</ListItemText>
          </MenuItem>,
          ...(menuState.plan.parent_id !== null
            ? [
                <MenuItem
                  key="promote"
                  onClick={() => {
                    onPromoteToRoot?.(menuState.plan.id);
                    setMenuState(null);
                  }}
                >
                  <ListItemIcon>
                    <VerticalAlignTopIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>ルート（独立した目標）にする</ListItemText>
                </MenuItem>,
              ]
            : []),
        ]}
      </Menu>
    </Box>
  );
}
