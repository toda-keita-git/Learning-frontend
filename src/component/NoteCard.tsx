import { useContext, useState } from "react";
import type { HTMLAttributes } from "react";
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
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AddIcon from "@mui/icons-material/Add";
import RepeatIcon from "@mui/icons-material/Repeat";
import { AuthContext } from "../Context";
import { useToast } from "../ToastContext";
import GitHubFileViewerDialog from "./GitHubFileViewerDialog";
import { getFileType } from "./getFileType";
import { decodeBase64Text, getImageDataUrl } from "./decodeBase64";
import MarkdownContent from "./MarkdownContent";
import type { Note, NoteAttachment } from "./PlanTypes";
import { NOTE_TYPE_LABEL } from "./PlanTypes";
import ProgressBadge from "./ProgressBadge";
import PlanPicker from "./PlanPicker";
import type { PlanOption } from "./PlanPicker";

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
  planOptions: PlanOption[];
  onLink: (planId: number) => void;
  onUnlink: (planId: number) => void;
  // プラン詳細のメモトレイ⇄タイムライン間ドラッグ用。呼び出し側がPointer Eventsハンドラを注入する
  dragProps?: HTMLAttributes<HTMLDivElement>;
  dragging?: boolean;
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onToggleTodo,
  planOptions,
  onLink,
  onUnlink,
  dragProps,
  dragging,
}: NoteCardProps) {
  const { octokit, githubLogin } = useContext(AuthContext);
  const { showToast } = useToast();
  const [viewerOpen, setViewerOpen] = useState<NoteAttachment | null>(null);
  const [viewerContent, setViewerContent] = useState("");
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedOptions = planOptions.filter((opt) => note.links.includes(opt.id));

  const handleViewAttachment = async (attachment: NoteAttachment) => {
    if (!octokit || !githubLogin) return;
    setLoadingAttachmentId(attachment.id ?? -1);
    try {
      const { data } = await octokit.repos.getContent({ owner: githubLogin, repo: attachment.repo_name, path: attachment.github_path });
      if (Array.isArray(data) || !("content" in data)) {
        throw new Error("フォルダーは表示できません。");
      }
      const raw = data.content.replace(/\n/g, "");
      const fileType = getFileType(attachment.github_path);
      const ext = attachment.github_path.split(".").pop() ?? "";
      const content = fileType === "image" ? getImageDataUrl(raw, ext) : decodeBase64Text(raw);
      setViewerContent(content);
      setViewerOpen(attachment);
    } catch (err) {
      console.error(err);
      showToast("添付の取得に失敗しました。ファイルが移動・削除された可能性があります。", "error");
    } finally {
      setLoadingAttachmentId(null);
    }
  };

  return (
    <Paper
      variant="outlined"
      data-note-id={note.id}
      {...dragProps}
      sx={{
        p: 2.5,
        borderRadius: 2,
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: TYPE_BORDER_COLOR[note.type],
        opacity: dragging ? 0.4 : 1,
        ...(dragProps?.style ?? {}),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={NOTE_TYPE_LABEL[note.type]} size="small" color={TYPE_COLOR[note.type]} variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {new Date(note.created_at).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}
            </Typography>
            {note.review_interval_days && (
              <Chip icon={<RepeatIcon fontSize="small" />} label={`${note.review_interval_days}日ごと`} size="small" variant="outlined" />
            )}
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
        <Stack sx={{ mt: 1.5 }}>
          <MarkdownContent text={note.body} />
        </Stack>
      )}

      {note.attachments.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.5, rowGap: 0.75 }}>
          {note.attachments.map((attachment) => (
            <Button
              key={attachment.id}
              size="small"
              variant="outlined"
              startIcon={
                loadingAttachmentId === attachment.id ? (
                  <CircularProgress size={14} />
                ) : attachment.kind === "image" ? (
                  <ImageOutlinedIcon fontSize="small" />
                ) : (
                  <GitHubIcon fontSize="small" />
                )
              }
              onClick={() => handleViewAttachment(attachment)}
              disabled={loadingAttachmentId !== null}
            >
              {attachment.github_path.split("/").pop()}
            </Button>
          ))}
        </Stack>
      )}

      {note.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1.5, rowGap: 0.5 }}>
          {note.tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1.5, rowGap: 0.5 }} alignItems="center">
        {linkedOptions.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            size="small"
            onDelete={() => onUnlink(opt.id)}
            sx={{ maxWidth: 220 }}
          />
        ))}
        <Chip
          icon={<AddIcon fontSize="small" />}
          label="プラン"
          size="small"
          variant={pickerOpen ? "filled" : "outlined"}
          color={pickerOpen ? "primary" : "default"}
          onClick={() => setPickerOpen((v) => !v)}
        />
      </Stack>

      {pickerOpen && <PlanPicker options={planOptions} linkedIds={note.links} onToggle={(id) => (note.links.includes(id) ? onUnlink(id) : onLink(id))} />}

      {viewerOpen && (
        <GitHubFileViewerDialog
          open={!!viewerOpen}
          onClose={() => setViewerOpen(null)}
          path={viewerOpen.github_path}
          content={PREVIEW_UNSUPPORTED.includes(getFileType(viewerOpen.github_path)) ? "" : viewerContent}
          isEditable={false}
          onUpdateFile={async () => {}}
        />
      )}
    </Paper>
  );
}
