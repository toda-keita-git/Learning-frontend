import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { useToast } from "../ToastContext";
import { buildArticleMarkdown, slugifyTitle } from "./articleExport";

interface ArticleSourceItem {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number;
  category_name: string;
  tags: string[];
  reference_url: string | null;
  created_at: string;
  github_path: string;
}

interface ArticlePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  item: ArticleSourceItem | null;
  githubConnected: boolean;
  onSaveToGitHub: (markdown: string, path: string) => Promise<string | null>;
}

export default function ArticlePreviewDialog({
  open,
  onClose,
  item,
  githubConnected,
  onSaveToGitHub,
}: ArticlePreviewDialogProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const markdown = useMemo(() => (item ? buildArticleMarkdown(item) : ""), [item]);
  const path = useMemo(
    () => (item ? `articles/${slugifyTitle(item.title)}-${item.id}.md` : ""),
    [item]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showToast("Markdownをクリップボードにコピーしました。", "success");
    } catch {
      showToast("コピーに失敗しました。", "error");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveToGitHub(markdown, path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ArticleOutlinedIcon color="primary" /> 記事化プレビュー
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          この学習記録をMarkdown記事に変換しました。コピーしてZenn/Qiitaなどに貼り付けるか、GitHubリポジトリの
          <Box component="code" sx={{ mx: 0.5, fontFamily: "monospace" }}>
            {path}
          </Box>
          に保存できます。
        </Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            bgcolor: "action.hover",
            borderRadius: 2,
            fontFamily: "monospace",
            fontSize: "0.8rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 360,
            overflow: "auto",
          }}
        >
          {markdown}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={onClose}>閉じる</Button>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<ContentCopyIcon />} onClick={handleCopy}>
          クリップボードにコピー
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CloudUploadOutlinedIcon />}
          onClick={handleSave}
          disabled={!githubConnected || saving}
        >
          GitHubに保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
