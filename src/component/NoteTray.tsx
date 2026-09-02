import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ButtonBase from "@mui/material/ButtonBase";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SearchIcon from "@mui/icons-material/Search";
import AddLinkIcon from "@mui/icons-material/AddLink";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { Note, NoteType } from "./PlanTypes";
import { NOTE_TYPE_LABEL } from "./PlanTypes";
import { NOTE_TYPE_COLOR, NOTE_TYPE_BORDER_COLOR } from "./noteVisuals";
import DragHintTooltip from "./DragHintTooltip";
import { maybeAutoScrollWindow } from "./dragAutoScroll";
import PlanSelectDialog from "./PlanSelectDialog";
import type { PlanOption } from "./PlanPicker";
import { NOTE_TRAY_EXPANDED_HEIGHT } from "./noteTrayLayout";
import NoteTrayHelpDialog from "./NoteTrayHelpDialog";

interface NoteTrayProps {
  notes: Note[];
  // ドラッグせずにリンク先を選べるようにするための候補一覧
  planOptions: PlanOption[];
  // 開いているプラン。リンク済みのメモに印を付けて、二重ドラッグの空振りを防ぐ
  selectedPlanId: number | null;
  onLinkNote: (note: Note, planId: number) => void;
  onCreatePlanFromNote: (note: Note) => void;
  // 行の中央をタップしたときに、そのメモの内容を読める画面を開く
  onPreviewNote: (note: Note) => void;
  // ボード側のUI（新規プラン作成ゾーンの表示・プラン行のハイライト）を連動させるための通知
  onDraggingChange?: (draggingNoteId: number | null) => void;
  onHoverPlanChange?: (planId: number | null) => void;
  onHoverCreateZoneChange?: (hovering: boolean) => void;
  // 開閉は親で持つ。展開時、プランボード側に「トレイの高さぶん下に余白を足す」よう
  // 伝える必要があり、親が両者のサイズを揃えて把握する必要があるため
  expanded: boolean;
  onToggleExpanded: () => void;
}

// 一度に描画する行数の上限。これを超える分は検索・絞り込みで辿らせる。
// メモが数百件になってもDOMが膨らまず、トレイのスクロールが重くならないようにするための保険
const MAX_VISIBLE = 60;

type TypeFilter = NoteType | "all";

type DropTarget = { kind: "plan"; planId: number } | { kind: "create" } | null;

// 「プラン」タブなら常にどこからでも開ける、常設の未整理メモ一覧。
//
// 操作は3通り用意する:
//  1. 左端のドラッグハンドル（PlanTreeのプラン並べ替えと同じ操作感）でプラン行や新規作成ゾーンへ運ぶ
//  2. 右端の「リンク」ボタンから、検索付きダイアログでリンク先を選ぶ
//  3. 行の中央をタップして、メモの内容を読む
// ドラッグはドロップ先が画面内にある時しか使えないため、件数が増えても確実に届く(2)を必ず併設する。
// 中央のタップは(2)と同じ動作にしていたが、タイトルしか見えないトレイでは
// 「中身を確かめてからリンクしたい」場面が多いため、内容表示に割り当てている。
//
// ハンドル以外はtouchAction: "pan-y"のままにしてあり、指を置いた場所に関わらず
// トレイを縦スクロールできる（以前は全カードがtouchAction: "none"でスクロールを奪っていた）。
export default function NoteTray({
  notes,
  planOptions,
  selectedPlanId,
  onLinkNote,
  onCreatePlanFromNote,
  onPreviewNote,
  onDraggingChange,
  onHoverPlanChange,
  onHoverCreateZoneChange,
  expanded,
  onToggleExpanded,
}: NoteTrayProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [linkPickerNote, setLinkPickerNote] = useState<Note | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const rafId = useRef<number | null>(null);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const dropTargetRef = useRef<DropTarget>(null);

  // 新しいメモほど探す頻度が高いので、まず新着順に並べてから絞り込む
  const sorted = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((n) => {
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [sorted, query, typeFilter]);

  const visible = filtered.slice(0, MAX_VISIBLE);
  const hiddenCount = filtered.length - visible.length;

  const draggingNote = draggingId !== null ? notes.find((n) => n.id === draggingId) ?? null : null;

  // 行に添える紐づけ先の表示。プラン名は「目標 / アクションプラン」という
  // 階層パスなので、1行に収まるよう末尾（一番近いプラン名）だけを出す
  const linkLabel = (note: Note): string | null => {
    if (note.links.length === 0) return null;
    const first = planOptions.find((o) => o.id === note.links[0]);
    const head = first ? first.label.split(" / ").pop() ?? first.label : "リンク済み";
    return note.links.length > 1 ? `${head} ほか${note.links.length - 1}件` : head;
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

  // ドラッグ中の再描画は1フレームにつき1回だけにする（指を動かすたびにsetStateすると
  // 件数が増えたときにトレイ全体の再描画が積み上がってカクつくため）
  const processMove = () => {
    rafId.current = null;
    const point = pendingPoint.current;
    if (!point || draggingIdRef.current === null) return;

    setPointer(point);
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
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    const id = draggingIdRef.current;
    const target = dropTargetRef.current;
    if (id !== null) {
      const note = notes.find((n) => n.id === id);
      if (note && target) {
        if (target.kind === "create") {
          onCreatePlanFromNote(note);
        } else if (!note.links.includes(target.planId)) {
          onLinkNote(note, target.planId);
        }
      }
    }
    pendingPoint.current = null;
    draggingIdRef.current = null;
    dropTargetRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
    setPointer(null);
    onDraggingChange?.(null);
    onHoverPlanChange?.(null);
    onHoverCreateZoneChange?.(false);
  };

  // ドラッグはハンドルからのみ開始する。PlanTreeのプラン行と同じく、
  // 長押し待ちを挟まずポインタを押した瞬間に掴める
  const handleHandlePointerDown = (note: Note) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    pendingPoint.current = { x: e.clientX, y: e.clientY };
    draggingIdRef.current = note.id;
    dropTargetRef.current = null;
    setDraggingId(note.id);
    setDropTarget(null);
    setPointer({ x: e.clientX, y: e.clientY });
    onDraggingChange?.(note.id);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingIdRef.current === null) return;
    pendingPoint.current = { x: e.clientX, y: e.clientY };
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(processMove);
    }
  };

  const hintKind = dropTarget?.kind === "create" ? "create" : dropTarget?.kind === "plan" ? "link" : null;

  // リンク先ダイアログにはリンク済みのプランを出さない（選んでも何も起きない選択肢を作らない）
  const linkPickerOptions = useMemo(() => {
    if (!linkPickerNote) return [];
    return planOptions.filter((o) => !linkPickerNote.links.includes(o.id));
  }, [linkPickerNote, planOptions]);

  return (
    <Paper
      elevation={4}
      sx={{
        // 折りたたみ中は見出し行だけの高さで下部ナビのすぐ上に固定し、常に画面最下部に見える位置を保つ。
        // 展開時は画面の下半分ちょうどの高さまで広げる（上半分にプランボードが残るようにし、
        // メモをドラッグしてプランへドロップできる状態を保つ）
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 56,
        height: expanded ? NOTE_TRAY_EXPANDED_HEIGHT : "auto",
        borderRadius: 0,
        borderTop: "1px solid",
        borderColor: "divider",
        zIndex: (t) => t.zIndex.appBar - 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1, cursor: "pointer", flexShrink: 0 }}
        onClick={onToggleExpanded}
      >
        <DescriptionOutlinedIcon fontSize="small" color="action" />
        <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
          未整理のメモ（
          {expanded && filtered.length !== notes.length ? `${filtered.length} / ${notes.length}件` : `${notes.length}件`}
          ）
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setHelpOpen(true);
          }}
          aria-label="未整理のメモの使い方"
        >
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label={expanded ? "閉じる" : "開く"}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>

      {expanded && (
        <Box sx={{ px: 1.5, pb: 1.5, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1, mb: 1, flexShrink: 0 }}>
            <TextField
              size="small"
              placeholder="メモを検索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ flex: "1 1 160px", minWidth: 140 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={typeFilter}
              onChange={(_, v: TypeFilter | null) => v && setTypeFilter(v)}
            >
              <ToggleButton value="all">すべて</ToggleButton>
              <ToggleButton value="learning">{NOTE_TYPE_LABEL.learning}</ToggleButton>
              <ToggleButton value="task">{NOTE_TYPE_LABEL.task}</ToggleButton>
              <ToggleButton value="normal">{NOTE_TYPE_LABEL.normal}</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* 縦スクロールのリストにして、件数が増えても「横に延々とスワイプする」状態にならないようにする。
              展開時のトレイ自体がプランボードと同じ高さまで広がるため、ここは残り領域いっぱいまで伸ばす */}
          <Stack
            spacing={0.75}
            sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", touchAction: "pan-y" }}
          >
            {filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                {notes.length === 0 ? "メモがありません。" : "条件に合うメモがありません。"}
              </Typography>
            ) : (
              visible.map((note) => {
                const alreadyLinked = selectedPlanId !== null && note.links.includes(selectedPlanId);
                return (
                  <Paper
                    key={note.id}
                    variant="outlined"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      pr: 0.5,
                      borderRadius: 2,
                      borderLeftWidth: 3,
                      borderLeftStyle: "solid",
                      borderLeftColor: NOTE_TYPE_BORDER_COLOR[note.type],
                      opacity: draggingId === note.id ? 0.4 : 1,
                    }}
                  >
                    <Box
                      data-drag-handle="true"
                      onPointerDown={handleHandlePointerDown(note)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={finishDrag}
                      aria-label={`${note.title} をドラッグしてプランへ`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        px: 0.5,
                        py: 1,
                        borderRadius: 1,
                        cursor: "grab",
                        touchAction: "none",
                        "&:active": { cursor: "grabbing", bgcolor: "action.hover" },
                      }}
                    >
                      <DragIndicatorIcon fontSize="small" sx={{ color: "text.disabled" }} />
                    </Box>

                    <ButtonBase
                      onClick={() => onPreviewNote(note)}
                      aria-label={`${note.title} の内容を見る`}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        gap: 0.25,
                        py: 0.75,
                        px: 0.25,
                        borderRadius: 1,
                        justifyContent: "center",
                        textAlign: "left",
                        touchAction: "pan-y",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                        <Chip
                          label={NOTE_TYPE_LABEL[note.type]}
                          size="small"
                          color={NOTE_TYPE_COLOR[note.type]}
                          variant="outlined"
                          sx={{ flexShrink: 0 }}
                        />
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                          {note.title}
                        </Typography>
                        {alreadyLinked && (
                          <Tooltip title="このプランにリンク済み">
                            <CheckCircleIcon fontSize="small" color="success" sx={{ flexShrink: 0 }} />
                          </Tooltip>
                        )}
                      </Box>
                      {/* トレイはタイトルしか出ないため、どのプランのメモなのかが分からなかった。
                          1行だけ紐づけ先を添える（複数ある場合は先頭＋残り件数） */}
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ color: linkLabel(note) ? "text.secondary" : "text.disabled", minWidth: 0 }}
                      >
                        {linkLabel(note) ?? "未リンク"}
                      </Typography>
                    </ButtonBase>

                    <Tooltip title="リンク先のプランを選ぶ">
                      <IconButton size="small" onClick={() => setLinkPickerNote(note)} aria-label="リンク先のプランを選ぶ">
                        <AddLinkIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                );
              })
            )}
            {hiddenCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ py: 1, textAlign: "center" }}>
                他 {hiddenCount} 件。検索や種別で絞り込んでください。
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {/* ドラッグ中の見た目は元カードを動かすのではなく画面上に浮かせる。
          トレイがoverflow:autoでクリップされるため、元カードを動かすとトレイの外へ出た瞬間に消えてしまう */}
      {draggingNote && pointer && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            left: pointer.x + 12,
            top: pointer.y - 20,
            zIndex: (t) => t.zIndex.tooltip - 1,
            px: 1.25,
            py: 0.75,
            maxWidth: 220,
            borderRadius: 2,
            borderLeft: "3px solid",
            borderLeftColor: NOTE_TYPE_BORDER_COLOR[draggingNote.type],
            pointerEvents: "none",
          }}
        >
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {draggingNote.title}
          </Typography>
        </Paper>
      )}

      {pointer && <DragHintTooltip kind={hintKind} x={pointer.x} y={pointer.y} />}

      <PlanSelectDialog
        open={!!linkPickerNote}
        onClose={() => setLinkPickerNote(null)}
        title={linkPickerNote ? `「${linkPickerNote.title}」のリンク先を選ぶ` : ""}
        options={linkPickerOptions}
        emptyText="リンクできるプランがありません。下の「新しいプランにする」から作成できます。"
        extraActionLabel="新しいプランにする"
        onExtraAction={() => {
          if (linkPickerNote) onCreatePlanFromNote(linkPickerNote);
        }}
        onSelect={(planId) => {
          if (linkPickerNote) onLinkNote(linkPickerNote, planId);
        }}
      />

      <NoteTrayHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Paper>
  );
}
