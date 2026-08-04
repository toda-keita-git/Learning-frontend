import { useContext, useEffect, useState } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import CircularProgress from "@mui/material/CircularProgress";
import { AuthContext } from "../Context";
import GitHubFileSelector from "./GitHubFileSelector";
import type { Note, NoteInput, NoteType, NoteTodoItem, CategoryOption } from "./GoalTypes";

export interface ActionPlanOption {
  id: number;
  label: string; // "{目標名} / {アクションプラン名}"
}

interface NoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NoteInput) => Promise<void>;
  initialNote?: Note | null;
  // 指定されている場合、アクションプラン選択欄を出さずこの値に固定する（アクションプラン詳細からの新規作成）
  fixedActionPlanId?: number | null;
  actionPlanOptions: ActionPlanOption[];
  categories: CategoryOption[];
  tagOptions: string[];
}

const emptyTodo = (): NoteTodoItem => ({ label: "", checked: false });

export default function NoteFormDialog({
  open,
  onClose,
  onSubmit,
  initialNote,
  fixedActionPlanId,
  actionPlanOptions,
  categories,
  tagOptions,
}: NoteFormDialogProps) {
  const [type, setType] = useState<NoteType>("normal");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionPlanId, setActionPlanId] = useState<number | "">("");
  const [mastery, setMastery] = useState(0);
  const [progress, setProgress] = useState(0);
  const [todoItems, setTodoItems] = useState<NoteTodoItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [githubPath, setGithubPath] = useState<string | null>(null);
  const [commitSha, setCommitSha] = useState<string | null>(null);
  const [repoNameField, setRepoNameField] = useState<string | null>(null);
  const [githubSelectorOpen, setGithubSelectorOpen] = useState(false);
  const [resolvingSha, setResolvingSha] = useState(false);
  const [saving, setSaving] = useState(false);

  const { octokit, githubLogin, repoName } = useContext(AuthContext);

  useEffect(() => {
    if (!open) return;
    if (initialNote) {
      setType(initialNote.type);
      setTitle(initialNote.title);
      setBody(initialNote.body ?? "");
      setActionPlanId(initialNote.action_plan_id ?? "");
      setMastery(initialNote.mastery ?? 0);
      setProgress(initialNote.progress ?? 0);
      setTodoItems(initialNote.todo_items?.length ? initialNote.todo_items : []);
      setCategoryId(initialNote.category_id ?? "");
      setTags(initialNote.tags ?? []);
      setGithubPath(initialNote.github_path ?? null);
      setCommitSha(initialNote.commit_sha ?? null);
      setRepoNameField(initialNote.repo_name ?? null);
    } else {
      setType("normal");
      setTitle("");
      setBody("");
      setActionPlanId(fixedActionPlanId ?? "");
      setMastery(0);
      setProgress(0);
      setTodoItems([]);
      setCategoryId("");
      setTags([]);
      setGithubPath(null);
      setCommitSha(null);
      setRepoNameField(null);
    }
  }, [open, initialNote, fixedActionPlanId]);

  const handleGithubFileSelect = async (path: string) => {
    setGithubSelectorOpen(false);
    setGithubPath(path);
    setRepoNameField(repoName);
    setResolvingSha(true);
    try {
      if (octokit && githubLogin && repoName) {
        const { data } = await octokit.repos.getContent({ owner: githubLogin, repo: repoName, path });
        setCommitSha(!Array.isArray(data) && "sha" in data ? data.sha : null);
      }
    } catch {
      setCommitSha(null);
    } finally {
      setResolvingSha(false);
    }
  };

  const handleAddTodo = () => setTodoItems((prev) => [...prev, emptyTodo()]);
  const handleTodoLabelChange = (index: number, label: string) =>
    setTodoItems((prev) => prev.map((t, i) => (i === index ? { ...t, label } : t)));
  const handleTodoToggle = (index: number) =>
    setTodoItems((prev) => prev.map((t, i) => (i === index ? { ...t, checked: !t.checked } : t)));
  const handleTodoRemove = (index: number) =>
    setTodoItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: NoteInput = {
        action_plan_id: actionPlanId === "" ? null : Number(actionPlanId),
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
        github_path: type === "learning" ? githubPath : null,
        commit_sha: type === "learning" ? commitSha : null,
        repo_name: type === "learning" ? repoNameField : null,
      };
      await onSubmit(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

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

          {fixedActionPlanId === undefined && (
            <TextField
              select
              label="アクションプラン"
              value={actionPlanId}
              onChange={(e) => setActionPlanId(e.target.value === "" ? "" : Number(e.target.value))}
              helperText="未選択のまま保存すると、後から一覧で紐付けられます"
              fullWidth
            >
              <MenuItem value="">未紐付け</MenuItem>
              {actionPlanOptions.map((opt) => (
                <MenuItem key={opt.id} value={opt.id}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          {type === "learning" && (
            <Stack spacing={1.5}>
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

              <div>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  GitHubのコードを添付（任意）
                </Typography>
                {githubPath ? (
                  <Chip
                    icon={<GitHubIcon />}
                    label={resolvingSha ? `${githubPath}（確認中…）` : githubPath}
                    onDelete={() => {
                      setGithubPath(null);
                      setCommitSha(null);
                      setRepoNameField(null);
                    }}
                    sx={{ maxWidth: "100%" }}
                  />
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GitHubIcon />}
                    disabled={!octokit || !repoName}
                    onClick={() => setGithubSelectorOpen(true)}
                  >
                    リポジトリからファイルを選ぶ
                  </Button>
                )}
                {!octokit && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    GitHub連携の準備ができていません。
                  </Typography>
                )}
              </div>
            </Stack>
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

          <TextField
            label="本文"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            minRows={4}
            fullWidth
          />

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
