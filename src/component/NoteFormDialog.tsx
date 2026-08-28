import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
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
import GoogleIcon from "@mui/icons-material/Google";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AttachmentProviderIcon from "./AttachmentProviderIcon";
import { attachmentProviderLabel } from "./attachmentVisuals";
import CircularProgress from "@mui/material/CircularProgress";
import { AuthContext } from "../Context";
import { useToast } from "../ToastContext";
import GitHubFileSelector from "./GitHubFileSelector";
import GoogleDriveFileSelector from "./GoogleDriveFileSelector";
import { uploadDriveFile } from "./driveClient";
import MarkdownContent from "./MarkdownContent";
import { ROUTINE_PRESETS } from "./routine";
import type { Note, NoteInput, NoteType, NoteTodoItem, NoteAttachment, CategoryOption } from "./PlanTypes";

const emptyTodo = (): NoteTodoItem => ({ label: "", checked: false });

// 全角数字（IME経由でよく入力される）を半角へ正規化してから数字以外を取り除く。
// type="number"はモバイルIMEによっては全角のまま渡ってきて弾かれてしまうため、
// type="text"+inputMode="numeric"にした上でこちらで正規化する
const normalizeDigits = (raw: string): string =>
  raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[^0-9]/g, "");

const errorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "オフライン、または通信が不安定なため実行できませんでした。オンラインに戻ってからもう一度お試しください。";
    }
    if (typeof err.response.data === "string" && err.response.data) {
      return err.response.data;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

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
  // カテゴリーをタグと同様、その場で新規作成できるようにする（未指定なら選択のみ）
  onCreateCategory?: (name: string) => Promise<CategoryOption>;
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
  onCreateCategory,
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
  const [reviewIntervalDays, setReviewIntervalDays] = useState<number | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [githubSelectorOpen, setGithubSelectorOpen] = useState(false);
  const [driveSelectorOpen, setDriveSelectorOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [resolvingCodeSha, setResolvingCodeSha] = useState(false);
  const [saving, setSaving] = useState(false);
  // 両方の保存先が使える場合に、利用者がどちらへ保存するかを選ぶ
  const [attachTargetChoice, setAttachTargetChoice] = useState<"github" | "google">("github");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { octokit, githubLogin, repoName, authProvider, driveFolderId, ensureDriveAccessToken } =
    useContext(AuthContext);
  const { showToast } = useToast();

  // 添付の保存先として使えるか。ログインに使ったプロバイダーではなく、
  // 実際にその保存先を使う手段が揃っているかで判定する。
  // （以前は authProvider === "google" を条件にしていたため、GitHubでログイン中は
  //   Googleを連携済みでもDriveが選べなかった）
  //
  // GitHub: ブラウザ側にアクセストークン(octokit)が必要なので、GitHubでログイン中のみ使える。
  // Drive : アクセストークンはrefresh_tokenからサーバー経由で取り直せるため、
  //         連携さえしていればどちらでログイン中でも使える。
  const hasGithub = !!octokit && !!repoName;
  const hasGoogleDrive = !!driveFolderId;
  const hasAnyStorage = hasGithub || hasGoogleDrive;
  const hasBothStorages = hasGithub && hasGoogleDrive;
  // 実際に保存する先。両方使える場合だけ利用者が選べるようにする
  const attachTarget: "github" | "google" = hasBothStorages
    ? attachTargetChoice
    : hasGoogleDrive
      ? "google"
      : "github";

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
      setReviewIntervalDays(initialNote.review_interval_days ?? null);
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
      setReviewIntervalDays(null);
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
    if (!files || files.length === 0) return;

    if (attachTarget === "google") {
      if (!driveFolderId) return;
      setUploadingImages(true);
      try {
        const accessToken = await ensureDriveAccessToken();
        if (!accessToken) throw new Error("Driveのアクセストークンを取得できませんでした。");
        for (const file of Array.from(files)) {
          const { id: fileId } = await uploadDriveFile(accessToken, driveFolderId, file);
          await addAttachmentLocallyOrRemotely({
            kind: "image",
            github_path: fileId,
            // commit_sha列はGitHubでは未使用（画像はコミットshaを取らない）ため、
            // Drive添付ではここにファイル名を流用してチップ表示に使う
            commit_sha: file.name,
            repo_name: driveFolderId,
            provider: "google",
          });
        }
      } catch (err) {
        console.error(err);
        showToast("画像のアップロードに失敗しました。", "error");
      } finally {
        setUploadingImages(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    if (!octokit || !githubLogin || !repoName) return;
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
        await addAttachmentLocallyOrRemotely({
          kind: "image",
          github_path: path,
          commit_sha: sha,
          repo_name: repoName,
          provider: "github",
        });
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
      await addAttachmentLocallyOrRemotely({
        kind: "code",
        github_path: path,
        commit_sha: sha,
        repo_name: repoName,
        provider: "github",
      });
    } catch (err) {
      console.error(err);
      showToast("コードの添付に失敗しました。", "error");
    } finally {
      setResolvingCodeSha(false);
    }
  };

  const handleDriveFileSelect = async (fileId: string, fileName: string) => {
    setDriveSelectorOpen(false);
    if (!driveFolderId) return;
    await addAttachmentLocallyOrRemotely({
      kind: "code",
      github_path: fileId,
      commit_sha: fileName,
      repo_name: driveFolderId,
      provider: "google",
    });
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
        review_interval_days: reviewIntervalDays,
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


  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialNote ? "メモを編集" : "メモを作成"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Tabs value={type} onChange={(_, v) => setType(v)} variant="fullWidth">
            <Tab value="learning" label="学習用" />
            <Tab value="task" label="チェックリスト用" />
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

          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">本文</Typography>
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
                minRows={6}
                fullWidth
                placeholder={"Markdown記法が使えます\n**太字** / # 見出し / - 箇条書き / `コード` / ==ハイライト=="}
              />
            ) : (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, minHeight: 140 }}>
                <MarkdownContent text={body} />
              </Box>
            )}
          </Stack>

          <div>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              画像・コードの添付（任意・複数可）
            </Typography>

            {/* 両方の保存先が使えるときは、どちらに保存するかを利用者に選ばせる。
                選ばせないと「どちらに入ったか分からない」状態になってしまうため。
                片方しか使えないときは選択肢を出さず、どこに入るかだけを示す */}
            {hasAnyStorage &&
              (hasBothStorages ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    保存先
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={attachTargetChoice}
                    onChange={(_, v: "github" | "google" | null) => v && setAttachTargetChoice(v)}
                  >
                    <ToggleButton value="github">
                      <GitHubIcon fontSize="small" sx={{ mr: 0.5 }} />
                      GitHub
                    </ToggleButton>
                    <ToggleButton value="google">
                      <GoogleIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Google
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <AttachmentProviderIcon provider={attachTarget} />
                  {attachmentProviderLabel(attachTarget)}に保存されます
                </Typography>
              ))}
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1, rowGap: 0.75 }}>
              {attachments.map((attachment, index) => {
                const isGoogle = attachment.provider === "google";
                // Drive添付はgithub_pathがfileId（ファイル名ではない）なので、
                // commit_sha列に流用保存したファイル名があればそちらを表示に使う
                const label = isGoogle
                  ? attachment.commit_sha || attachment.github_path
                  : attachment.github_path.split("/").pop();
                return (
                  <Chip
                    key={attachment.id ?? `${attachment.github_path}-${index}`}
                    icon={<AttachmentProviderIcon provider={attachment.provider} />}
                    // 保存先（GitHub / Drive）を必ず添えて、開かなくても分かるようにする
                    label={`${attachmentProviderLabel(attachment.provider)}・${label}`}
                    onDelete={() => handleRemoveAttachment(attachment, index)}
                    sx={{ maxWidth: 260 }}
                  />
                );
              })}
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
                disabled={!hasAnyStorage || uploadingImages}
                onClick={() => fileInputRef.current?.click()}
              >
                画像を選ぶ
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  resolvingCodeSha ? <CircularProgress size={14} /> : <AttachmentProviderIcon provider={attachTarget} />
                }
                disabled={!hasAnyStorage || resolvingCodeSha}
                onClick={() => (attachTarget === "google" ? setDriveSelectorOpen(true) : setGithubSelectorOpen(true))}
              >
                {attachTarget === "google" ? "ドライブから選ぶ" : "コードを選ぶ"}
              </Button>
            </Stack>
            {!hasAnyStorage && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {authProvider === "google"
                  ? "Googleドライブ連携の準備ができていないため、添付は使えません。"
                  : "GitHub連携の準備ができていないため、添付は使えません。"}
              </Typography>
            )}
          </div>

          <div>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              繰り返し（「習慣リスト」タブにやることとして表示）
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center" sx={{ rowGap: 0.75 }}>
              <Chip
                label="なし"
                size="small"
                variant={reviewIntervalDays === null ? "filled" : "outlined"}
                color={reviewIntervalDays === null ? "primary" : "default"}
                onClick={() => setReviewIntervalDays(null)}
              />
              {ROUTINE_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  size="small"
                  variant={reviewIntervalDays === preset.days ? "filled" : "outlined"}
                  color={reviewIntervalDays === preset.days ? "primary" : "default"}
                  onClick={() => setReviewIntervalDays(preset.days)}
                />
              ))}
              <TextField
                type="text"
                inputMode="numeric"
                size="small"
                label="カスタム(日)"
                value={reviewIntervalDays !== null && !ROUTINE_PRESETS.some((p) => p.days === reviewIntervalDays) ? String(reviewIntervalDays) : ""}
                onChange={(e) => {
                  const digits = normalizeDigits(e.target.value);
                  if (digits === "") {
                    setReviewIntervalDays(null);
                    return;
                  }
                  const n = Number(digits);
                  if (Number.isFinite(n) && n > 0) setReviewIntervalDays(n);
                }}
                slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
                sx={{ width: 130 }}
              />
            </Stack>
          </div>

          <Autocomplete
            freeSolo
            options={categories}
            loading={creatingCategory}
            getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
            isOptionEqualToValue={(o, v) => o.id === (v as CategoryOption).id}
            value={categories.find((c) => c.id === categoryId) ?? null}
            onChange={async (_, newValue) => {
              if (newValue === null) {
                setCategoryId("");
                return;
              }
              if (typeof newValue !== "string") {
                setCategoryId(newValue.id);
                return;
              }
              const trimmed = newValue.trim();
              if (!trimmed) {
                setCategoryId("");
                return;
              }
              const existing = categories.find((c) => c.name === trimmed);
              if (existing) {
                setCategoryId(existing.id);
                return;
              }
              if (!onCreateCategory) return;
              setCreatingCategory(true);
              try {
                const created = await onCreateCategory(trimmed);
                setCategoryId(created.id);
              } catch (err) {
                showToast(errorMessage(err, "カテゴリーの作成に失敗しました。"), "error");
              } finally {
                setCreatingCategory(false);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="カテゴリー"
                placeholder="選択、または入力して新規作成"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {creatingCategory ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />

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
      <GoogleDriveFileSelector
        open={driveSelectorOpen}
        onClose={() => setDriveSelectorOpen(false)}
        onFileSelect={handleDriveFileSelect}
      />
    </Dialog>
  );
}
