import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
// ★ コピーアイコンをインポート
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
// ★ SnackbrとAlertをインポート
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import type { AlertProps } from "@mui/material/Alert";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Box from "@mui/material/Box";

import TextField from "@mui/material/TextField";

// Snackbar用のAlertコンポーネント
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface Props {
  open: boolean;
  onClose: () => void;
  path: string;
  content: string;
  isEditable: boolean; // ★ 編集可能かどうかを受け取る
  onUpdateFile: (path: string, newContent: string) => Promise<void>;
}

const GitHubFileViewerDialog: React.FC<Props> = ({
  open,
  onClose,
  path,
  content,
  isEditable, // ★ propsとして受け取る
  onUpdateFile,
}) => {
  // ★ コピースナックバーのState
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  useEffect(() => {
    setEditedContent(content);
    setIsEditing(false);
  }, [content, open]);

  const handleSave = () => {
    onUpdateFile(path, editedContent);
  };

  // ファイルの拡張子を取得
  const getLanguage = (path: string) => {
    const extension = path.split(".").pop()?.toLowerCase();

    // ファイル名自体で判定した方が良いもの (Dockerfileなど)
    const filename = path.split("/").pop()?.toLowerCase();
    if (filename === "dockerfile") return "docker";

    switch (extension) {
      // --- Web, Frontend ---
      case "js":
      case "cjs":
      case "mjs":
        return "javascript";
      case "jsx":
        return "jsx";
      case "ts":
        return "typescript";
      case "tsx":
        return "tsx";
      case "html":
      case "htm":
        return "html";
      case "css":
        return "css";
      case "scss":
      case "sass":
        return "scss";
      case "less":
        return "less";
      case "vue":
        return "vue";
      case "svelte":
        return "svelte";

      // --- Backend ---
      case "py":
      case "pyw":
        return "python";
      case "java":
      case "jar":
        return "java";
      case "php":
        return "php";
      case "go":
        return "go";
      case "rb":
        return "ruby";
      case "cs":
      case "csx":
        return "csharp";
      case "rs":
        return "rust";
      case "kt":
      case "kts":
        return "kotlin";
      case "swift":
        return "swift";
      case "pl":
      case "pm":
        return "perl";
      case "ex":
      case "exs":
        return "elixir";

      // --- C Family ---
      case "c":
      case "h":
        return "c";
      case "cpp":
      case "hpp":
      case "cc":
        return "cpp";
      case "m":
        return "objectivec";

      // --- Markup & Data Formats ---
      case "json":
        return "json";
      case "xml":
        return "xml";
      case "yml":
      case "yaml":
        return "yaml";
      case "md":
      case "markdown":
        return "markdown";
      case "sql":
        return "sql";
      case "graphql":
      case "gql":
        return "graphql";
      case "toml":
        return "toml";
      case "csv":
        return "csv";
      case "svg":
        return "svg";

      // --- Scripting & Shell ---
      case "sh":
      case "bash":
      case "zsh":
        return "bash";
      case "ps1":
        return "powershell";
      case "bat":
      case "cmd":
        return "batch";
      case "lua":
        return "lua";

      // --- Config & Others ---
      case "ini":
        return "ini";
      case "env":
        return "properties"; // .envファイルはpropertiesとして解釈されることが多い
      case "gitignore":
      case "gitattributes":
      case "gitmodules":
        return "git";
      case "r":
        return "r";
      case "dart":
        return "dart";
      case "jl":
        return "julia";

      // --- バイナリファイル (プレビュー不可) ---
      case "xlsx":
      case "xls":
      case "doc":
      case "docx":
      case "ppt":
      case "pptx":
      case "pdf":
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "bmp":
      case "ico":
      case "zip":
      case "gz":
      case "tar":
      case "rar":
      case "exe":
      case "dll":
        return "binary"; // ★ 特別な識別子を返す

      // --- 認識できない拡張子 ---
      default:
        return "plaintext";
    }
  };

  const language = getLanguage(path);

  // ★ コピーボタンのハンドラー
  const handleCopyClick = async () => {
    // ★ 編集モードかどうかでコピーする内容を決定
    const textToCopy = isEditing ? editedContent : content;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setSnackbarOpen(true); // コピー成功時にスナックバーを表示
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // エラー処理（アラートなど）
    }
  };

  // ★ スナックバーを閉じるハンドラー
  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <>
      {" "}
      {/* ★ Snackbarをルートで含むためにFragmentを使用 */}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {path}
          <Box>
            {" "}
            {/* コピーボタンと閉じるボタンをまとめるBox */}
            <IconButton
              aria-label="copy content"
              onClick={handleCopyClick}
              color="primary" // または "inherit"
              sx={{ mr: 1 }} // 閉じるボタンとの間にマージン
            >
              <ContentCopyIcon />
            </IconButton>
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {isEditing ? (
            <TextField
              fullWidth
              multiline
              rows={20}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              variant="outlined"
            />
          ) : (
            /* SyntaxHighlighterを使ってコードを表示 */
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              showLineNumbers
              customStyle={{
                maxHeight: "60vh", // ダイアログのコンテンツの最大高さを設定
              }}
            >
              {content}
            </SyntaxHighlighter>
          )}
        </DialogContent>
        <DialogActions>
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)}>キャンセル</Button>
              <Button onClick={handleSave}>保存</Button>
            </>
          ) : (
            isEditable && (
              <Button onClick={() => setIsEditing(true)}>編集</Button>
            )
          )}
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
      {/* ★ コピースナックバー */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          クリップボードにコピーしました！
        </Alert>
      </Snackbar>
    </>
  );
};

export default GitHubFileViewerDialog;
