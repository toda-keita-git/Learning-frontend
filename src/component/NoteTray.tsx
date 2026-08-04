import { useState } from "react";
import type { HTMLAttributes } from "react";
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

interface NoteTrayProps {
  notes: Note[];
  draggingNoteId: number | null;
  dragPropsFor: (note: Note) => HTMLAttributes<HTMLDivElement>;
}

// 「プラン」タブなら常にどこからでも開ける、常設のメモトレイ。折りたたんでいても
// 存在は分かるようにし、展開すればどのメモも指で持ち上げてプランへドラッグできる
export default function NoteTray({ notes, draggingNoteId, dragPropsFor }: NoteTrayProps) {
  const [expanded, setExpanded] = useState(false);

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
                data-note-tray-item="true"
                variant="outlined"
                {...dragPropsFor(note)}
                sx={{
                  p: 1.25,
                  minWidth: 180,
                  maxWidth: 180,
                  borderRadius: 2,
                  cursor: "grab",
                  opacity: draggingNoteId === note.id ? 0.4 : 1,
                  flexShrink: 0,
                }}
              >
                <Chip label={NOTE_TYPE_LABEL[note.type]} size="small" sx={{ mb: 0.5 }} />
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {note.title}
                </Typography>
              </Paper>
            ))
          )}
        </Box>
      )}
    </Paper>
  );
}
