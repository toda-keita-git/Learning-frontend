import { useContext, useState } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import { AuthContext } from "../Context";
import { useToast } from "../ToastContext";
import GitHubFileViewerDialog from "./GitHubFileViewerDialog";
import { getFileType } from "./getFileType";
import { decodeBase64Text, getImageDataUrl } from "./decodeBase64";
import type { Note } from "./GoalTypes";
import { NOTE_TYPE_LABEL } from "./GoalTypes";
import ProgressBadge from "./ProgressBadge";

const TYPE_COLOR: Record<Note["type"], "warning" | "success" | "default"> = {
  learning: "warning",
  task: "success",
  normal: "default",
};

const TYPE_BORDER_COLOR: Record<Note["type"], string> = {
  learning: "warning.main",
  task: "success.main",
  normal: "divider",
};

const PREVIEW_UNSUPPORTED = ["excel", "pdf", "docx", "doc", "pptx", "zip-archive", "binary"];

interface NoteCardProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onToggleTodo: (todoItemId: number, checked: boolean) => void;
}

export default function NoteCard({ note, onEdit, onDelete, onToggleTodo }: NoteCardProps) {
  const { octokit, githubLogin } = useContext(AuthContext);
  const { showToast } = useToast();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  const handleViewCode = async () => {
    if (!note.github_path || !octokit || !githubLogin) return;
    const owner = githubLogin;
    const repo = note.repo_name ?? "";
    if (!repo) return;
    setLoadingCode(true);
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: note.github_path });
      if (Array.isArray(data) || !("content" in data)) {
        throw new Error("フォルダーは表示できません。");
      }
      const raw = data.content.replace(/\n/g, "");
      const fileType = getFileType(note.github_path);
      const ext = note.github_path.split(".").pop() ?? "";
      const content = fileType === "image" ? getImageDataUrl(raw, ext) : decodeBase64Text(raw);
      setViewerContent(content);
      setViewerOpen(true);
    } catch (err) {
      console.error(err);
      showToast("コードの取得に失敗しました。ファイルが移動・削除された可能性があります。", "error");
    } finally {
      setLoadingCode(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: TYPE_BORDER_COLOR[note.type],
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={NOTE_TYPE_LABEL[note.type]} size="small" color={TYPE_COLOR[note.type]} variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {new Date(note.created_at).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}
            </Typography>
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {note.title}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={onEdit} aria-label="編集">
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onDelete} aria-label="削除">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {note.effective_progress !== null && (
        <Stack sx={{ mt: 1.5, maxWidth: 260 }}>
          <ProgressBadge value={note.effective_progress} />
        </Stack>
      )}

      {note.type === "task" && note.todo_items.length > 0 && (
        <Stack sx={{ mt: 1 }}>
          {note.todo_items.map((item) => (
            <FormControlLabel
              key={item.id}
              control={
                <Checkbox
                  size="small"
                  checked={item.checked}
                  onChange={() => item.id !== undefined && onToggleTodo(item.id, !item.checked)}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "text.disabled" : "text.primary" }}
                >
                  {item.label}
                </Typography>
              }
            />
          ))}
        </Stack>
      )}

      {note.body && (
        <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: "pre-wrap", color: "text.secondary" }}>
          {note.body}
        </Typography>
      )}

      {note.github_path && (
        <Button
          size="small"
          startIcon={loadingCode ? <CircularProgress size={14} /> : <GitHubIcon fontSize="small" />}
          onClick={handleViewCode}
          disabled={loadingCode}
          sx={{ mt: 1.5 }}
        >
          {note.github_path}
        </Button>
      )}

      {note.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1.5, rowGap: 0.5 }}>
          {note.tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
          ))}
        </Stack>
      )}

      {note.github_path && (
        <GitHubFileViewerDialog
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          path={note.github_path}
          content={PREVIEW_UNSUPPORTED.includes(getFileType(note.github_path)) ? "" : viewerContent}
          isEditable={false}
          onUpdateFile={async () => {}}
        />
      )}
    </Paper>
  );
}
