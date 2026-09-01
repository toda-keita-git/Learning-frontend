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
import Box from "@mui/material/Box";
import AttachmentProviderIcon from "./AttachmentProviderIcon";
import { attachmentProviderLabel } from "./attachmentVisuals";
import AddIcon from "@mui/icons-material/Add";
import RepeatIcon from "@mui/icons-material/Repeat";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { AuthContext } from "../Context";
import { useToast } from "../ToastContext";
import GitHubFileViewerDialog from "./GitHubFileViewerDialog";
import { getFileType } from "./getFileType";
import { decodeBase64Text, getImageDataUrl } from "./decodeBase64";
import { getDriveFileBase64 } from "./driveClient";
import MarkdownContent from "./MarkdownContent";
import type { Note, NoteAttachment } from "./PlanTypes";
import { NOTE_TYPE_LABEL } from "./PlanTypes";
import { NOTE_TYPE_COLOR, NOTE_TYPE_BORDER_COLOR } from "./noteVisuals";
import ProgressBadge from "./ProgressBadge";
import PlanPicker from "./PlanPicker";
import type { PlanOption } from "./PlanPicker";

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
  const { octokit, githubLogin, ensureDriveAccessToken } = useContext(AuthContext);
  const { showToast } = useToast();
  const [viewerOpen, setViewerOpen] = useState<NoteAttachment | null>(null);
  const [viewerContent, setViewerContent] = useState("");
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedOptions = planOptions.filter((opt) => note.links.includes(opt.id));

  // Drive添付はgithub_pathがfileId（拡張子を持たない）なので、ファイル種別の判定や
  // タイトル表示にはcommit_sha列に流用保存したファイル名（表示名）を使う
  const attachmentDisplayPath = (attachment: NoteAttachment): string =>
    attachment.provider === "google" ? attachment.commit_sha || attachment.github_path : attachment.github_path;

  const handleViewAttachment = async (attachment: NoteAttachment) => {
    setLoadingAttachmentId(attachment.id ?? -1);
    try {
      let raw: string;
      const displayPath = attachmentDisplayPath(attachment);

      if (attachment.provider === "google") {
        const accessToken = await ensureDriveAccessToken();
        if (!accessToken) throw new Error("Driveのアクセストークンを取得できませんでした。");
        raw = await getDriveFileBase64(accessToken, attachment.github_path);
      } else {
        if (!octokit || !githubLogin) return;
        const { data } = await octokit.repos.getContent({
          owner: githubLogin,
          repo: attachment.repo_name,
          path: attachment.github_path,
        });
        if (Array.isArray(data) || !("content" in data)) {
          throw new Error("フォルダーは表示できません。");
        }
        raw = data.content.replace(/\n/g, "");
      }

      const fileType = getFileType(displayPath);
      const ext = displayPath.split(".").pop() ?? "";
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
        borderLeftColor: NOTE_TYPE_BORDER_COLOR[note.type],
        opacity: dragging ? 0.4 : 1,
        ...(dragProps?.style ?? {}),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={NOTE_TYPE_LABEL[note.type]} size="small" color={NOTE_TYPE_COLOR[note.type]} variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {new Date(note.created_at).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}
            </Typography>
            {note.review_interval_days && (
              <Chip icon={<RepeatIcon fontSize="small" />} label={`${note.review_interval_days}日ごと`} size="small" variant="outlined" />
            )}
          </Stack>
          {/* MUIのsubtitle1は既定でh6として描画されるが、画面見出し(h1)の直下に
              h6が並ぶと見出しレベルが飛ぶ。見た目はそのままにh2として扱う */}
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
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
                ) : (
                  <AttachmentProviderIcon provider={attachment.provider} />
                )
              }
              onClick={() => handleViewAttachment(attachment)}
              disabled={loadingAttachmentId !== null}
            >
              <Box component="span" sx={{ color: "text.secondary", mr: 0.5, flexShrink: 0 }}>
                {attachmentProviderLabel(attachment.provider)}
              </Box>
              {attachmentDisplayPath(attachment).split("/").pop()}
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

      {/* 紐づくプランは、タグ用のチップと見分けが付かないと「どのプランに属するメモか」が
          分からなくなる。見出しを添えた独立したブロックにし、1件ずつ行で表示する。
          プラン名は「目標 / アクションプラン」という階層パスなので長くなりやすく、
          チップだと途中で切れてどのプランか読み取れないため、折り返す行にしている */}
      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed", borderColor: "divider" }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
          <AccountTreeOutlinedIcon fontSize="small" color="action" />
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
            紐づくプラン{linkedOptions.length > 0 ? `（${linkedOptions.length}件）` : ""}
          </Typography>
        </Stack>

        {linkedOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            まだどのプランにも紐づいていません。
          </Typography>
        ) : (
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            {linkedOptions.map((opt) => (
              <Stack
                key={opt.id}
                direction="row"
                spacing={0.75}
                alignItems="flex-start"
                sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: "action.hover" }}
              >
                <FlagOutlinedIcon fontSize="small" color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                  {opt.label}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onUnlink(opt.id)}
                  aria-label={`「${opt.label}」とのリンクを外す`}
                  sx={{ flexShrink: 0 }}
                >
                  <LinkOffIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}

        <Chip
          icon={<AddIcon fontSize="small" />}
          label={linkedOptions.length === 0 ? "プランに紐づける" : "紐づけを変更"}
          size="small"
          variant={pickerOpen ? "filled" : "outlined"}
          color={pickerOpen ? "primary" : "default"}
          onClick={() => setPickerOpen((v) => !v)}
        />
      </Box>

      {pickerOpen && <PlanPicker options={planOptions} linkedIds={note.links} onToggle={(id) => (note.links.includes(id) ? onUnlink(id) : onLink(id))} />}

      {viewerOpen && (
        <GitHubFileViewerDialog
          open={!!viewerOpen}
          onClose={() => setViewerOpen(null)}
          path={attachmentDisplayPath(viewerOpen)}
          content={PREVIEW_UNSUPPORTED.includes(getFileType(attachmentDisplayPath(viewerOpen))) ? "" : viewerContent}
          isEditable={false}
          onUpdateFile={async () => {}}
        />
      )}
    </Paper>
  );
}
