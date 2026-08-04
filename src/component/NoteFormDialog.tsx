import { useContext, useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Box from "@mui/material/Box";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import { AuthContext } from "../Context";
import { useToast } from "../ToastContext";
import GitHubFileSelector from "./GitHubFileSelector";
import MarkdownContent from "./MarkdownContent";
import type { Note, NoteInput, NoteType, NoteTodoItem, NoteAttachment, CategoryOption } from "./PlanTypes";

const emptyTodo = (): NoteTodoItem => ({ label: "", checked: false });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface NoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NoteInput) => Promise<void>;
  initialNote?: Note | null;
  // 新規作成時のみ有効。指定するとその場でこのプランへリンクされた状態で作成する
  fixedPlanId?: number | null;
  // 既存メモの編集中に添付を増減した場合、その場でAPIを呼んで即時反映する
  onAddAttachment?: (attachment: Omit<NoteAttachment, "id" | "note_id">) => Promise<void>;
  onDeleteAttachment?: (attachmentId: number) => Promise<void>;
  categories: CategoryOption[];
  tagOptions: string[];
}

export default function NoteFormDialog({
  open,
  onClose,
  onSubmit,
  initialNote,
  fixedPlanId,
  onAddAttachment,
  onDeleteAttachment,
  categories,
  tagOptions,
}: NoteFormDialogProps) {
  const [type, setType] = useState<NoteType>("normal");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mastery, setMastery] = useState(0);
  const [progress, setProgress] = useState(0);
  const [todoItems, setTodoItems] = useState<NoteTodoItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [bodyTab, setBodyTab] = useState<"write" | "preview">("write");
  const [githubSelectorOpen, setGithubSelectorOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [resolvingCodeSha, setResolvingCodeSha] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { octokit, githubLogin, repoName } = useContext(AuthContext);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    setBodyTab("write");
    if (initialNote) {
      setType(initialNote.type);
      setTitle(initialNote.title);
      setBody(initialNote.body ?? "");
      setMastery(initialNote.mastery ?? 0);
      setProgress(initialNote.progress ?? 0);
      setTodoItems(initialNote.todo_items?.length ? initialNote.todo_items : []);
      setCategoryId(initialNote.category_id ?? "");
      setTags(initialNote.tags ?? []);
      setAttachments(initialNote.attachments ?? []);
    } else {
      setType("normal");
      setTitle("");
      setBody("");
      setMastery(0);
      setProgress(0);
      setTodoItems([]);
      setCategoryId("");
      setTags([]);
      setAttachments([]);
    }
  }, [open, initialNote]);

  const handleAddTodo = () => setTodoItems((prev) => [...prev, emptyTodo()]);
  const handleTodoLabelChange = (index: number, label: string) =>
    setTodoItems((prev) => prev.map((t, i) => (i === index ? { ...t, label } : t)));
  const handleTodoToggle = (index: number) =>
    setTodoItems((prev) => prev.map((t, i) => (i === index ? { ...t, checked: !t.checked } : t)));
  const handleTodoRemove = (index: number) =>
    setTodoItems((prev) => prev.filter((_, i) => i !== index));

  const addAttachmentLocallyOrRemotely = async (attachment: Omit<NoteAttachment, "id" | "note_id">) => {
    if (initialNote && onAddAttachment) {
      await onAddAttachment(attachment);
      // 編集中は呼び出し元がメモ一覧を再取得するので、ここではダイアログ表示用に楽観的に足しておく
      setAttachments((prev) => [...prev, attachment as NoteAttachment]);
    } else {
      setAttachments((prev) => [...prev, attachment as NoteAttachment]);
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || !octokit || !githubLogin || !repoName) return;
    setUploadingImages(true);
    try {
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `attachments/${Date.now()}-${safeName}`;
        const { data } = await octokit.repos.createOrUpdateFileContents({
          owner: githubLogin,
          repo: repoName,
          path,
          message: `add note image ${file.name}`,
          content: base64,
        });
        const sha = data.content && "sha" in data.content ? (data.content.sha as string) : null;
        await addAttachmentLocallyOrRemotely({ kind: "image", github_path: path, commit_sha: sha, repo_name: repoName });
      }
    } catch (err) {
      console.error(err);
      showToast("画像のアップロードに失敗しました。", "error");
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGithubFileSelect = async (path: string) => {
    setGithubSelectorOpen(false);
    if (!octokit || !githubLogin || !repoName) return;
    setResolvingCodeSha(true);
    try {
      const { data } = await octokit.repos.getContent({ owner: githubLogin, repo: repoName, path });
      const sha = !Array.isArray(data) && "sha" in data ? data.sha : null;
      await addAttachmentLocallyOrRemotely({ kind: "code", github_path: path, commit_sha: sha, repo_name: repoName });
    } catch (err) {
      console.error(err);
      showToast("コードの添付に失敗しました。", "error");
    } finally {
      setResolvingCodeSha(false);
    }
  };

  const handleRemoveAttachment = async (attachment: NoteAttachment, index: number) => {
    if (initialNote && attachment.id !== undefined && onDeleteAttachment) {
      await onDeleteAttachment(attachment.id);
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: NoteInput = {
        type,
        title: title.trim(),
        body: body.trim() || null,
        mastery: type === "learning" ? mastery : null,
        progress: type === "task" && todoItems.length === 0 ? progress : null,
        category_id: categoryId === "" ? null : Number(categoryId),
        todo_items:
          type === "task"
            ? todoItems.filter((t) => t.label.trim()).map((t) => ({ ...t, label: t.label.trim() }))
            : [],
        tags: tags.map((t) => t.trim()).filter(Boolean),
        ...(initialNote
          ? {}
          : {
              links: fixedPlanId !== undefined && fixedPlanId !== null ? [fixedPlanId] : [],
              attachments,
            }),
      };
      await onSubmit(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const hasGithub = !!octokit && !!repoName;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialNote ? "メモを編集" : "メモを作成"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Tabs value={type} onChange={(_, v) => setType(v)} variant="fullWidth">
            <Tab value="learning" label="学習用" />
            <Tab value="task" label="タスク用" />
            <Tab value="normal" label="通常" />
          </Tabs>

          <TextField
            label="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            autoFocus
          />

          {type === "learning" && (
            <div>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                習熟度: {mastery}%
              </Typography>
              <Slider
                value={mastery}
                onChange={(_, v) => setMastery(v as number)}
                valueLabelDisplay="auto"
                step={5}
                min={0}
                max={100}
              />
            </div>
          )}

          {type === "task" && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                todoリスト（チェックした割合が進捗度になります）
              </Typography>
              {todoItems.map((item, index) => (
                <Stack key={index} direction="row" spacing={1} alignItems="center">
                  <Checkbox checked={item.checked} onChange={() => handleTodoToggle(index)} size="small" />
                  <TextField
                    value={item.label}
                    onChange={(e) => handleTodoLabelChange(index, e.target.value)}
                    placeholder="やること"
                    size="small"
                    fullWidth
                  />
                  <IconButton size="small" onClick={() => handleTodoRemove(index)} aria-label="削除">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleAddTodo} size="small" sx={{ alignSelf: "flex-start" }}>
                todoを追加
              </Button>

              {todoItems.length === 0 && (
                <div>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    進捗度: {progress}%（todoが無い場合は手入力）
                  </Typography>
                  <Slider
                    value={progress}
                    onChange={(_, v) => setProgress(v as number)}
                    valueLabelDisplay="auto"
                    step={5}
                    min={0}
                    max={100}
                  />
                </div>
              )}
            </Stack>
          )}

          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                本文（Markdown記法対応: **太字** / # 見出し / - 箇条書き / `コード` / ==ハイライト==）
              </Typography>
              <ToggleButtonGroup
                value={bodyTab}
                exclusive
                size="small"
                onChange={(_, v) => v && setBodyTab(v)}
              >
                <ToggleButton value="write">編集</ToggleButton>
                <ToggleButton value="preview" disabled={!body.trim()}>
                  プレビュー
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {bodyTab === "write" ? (
              <TextField
                value={body}
                onChange={(e) => setBody(e.target.value)}
                multiline
                minRows={4}
                fullWidth
              />
            ) : (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 96 }}>
                <MarkdownContent text={body} />
              </Box>
            )}
          </Stack>

          <div>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              画像・コードの添付（任意・複数可）
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1, rowGap: 0.75 }}>
              {attachments.map((attachment, index) => (
                <Chip
                  key={attachment.id ?? `${attachment.github_path}-${index}`}
                  icon={attachment.kind === "image" ? <ImageOutlinedIcon /> : <GitHubIcon />}
                  label={attachment.github_path.split("/").pop()}
                  onDelete={() => handleRemoveAttachment(attachment, index)}
                  sx={{ maxWidth: 220 }}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={uploadingImages ? <CircularProgress size={14} /> : <ImageOutlinedIcon fontSize="small" />}
                disabled={!hasGithub || uploadingImages}
                onClick={() => fileInputRef.current?.click()}
              >
                画像を選ぶ
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={resolvingCodeSha ? <CircularProgress size={14} /> : <GitHubIcon fontSize="small" />}
                disabled={!hasGithub || resolvingCodeSha}
                onClick={() => setGithubSelectorOpen(true)}
              >
                コードを選ぶ
              </Button>
            </Stack>
            {!hasGithub && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                GitHub連携の準備ができていないため、添付は使えません。
              </Typography>
            )}
          </div>

          {categories.length > 0 && (
            <TextField
              select
              label="カテゴリー"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
              fullWidth
            >
              <MenuItem value="">なし</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Autocomplete
            multiple
            freeSolo
            options={tagOptions}
            value={tags}
            onChange={(_, value) => setTags(value)}
            renderInput={(params) => <TextField {...params} label="タグ" placeholder="Enterで追加" />}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !title.trim()}>
          {saving ? <CircularProgress size={20} /> : "保存"}
        </Button>
      </DialogActions>

      <GitHubFileSelector
        open={githubSelectorOpen}
        onClose={() => setGithubSelectorOpen(false)}
        onFileSelect={handleGithubFileSelect}
      />
    </Dialog>
  );
}
