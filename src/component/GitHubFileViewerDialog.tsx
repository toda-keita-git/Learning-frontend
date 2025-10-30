import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Snackbar,
  Box,
  TextField,
  Alert as MuiAlert,
} from "@mui/material";
import type { AlertProps } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useGetImageUrl } from "./useGetImageUrl"; // ✅ 画像アップロード用hook

// Snackbar用のAlert
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
  /** すでにデコードされたテキストまたは data:image/... URL */
  content: string;
  isEditable: boolean;
  onUpdateFile: (path: string, newContent: string) => Promise<void>;
}

const GitHubFileViewerDialog: React.FC<Props> = ({
  open,
  onClose,
  path,
  content,
  isEditable,
  onUpdateFile,
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const extension = path.split(".").pop()?.toLowerCase() || "";
  const isImageFile = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "ico", "webp"].includes(extension);

  // 画像プレビューURL（編集モードでアップロードした場合）
  const imageUrl = useGetImageUrl(imageFile);

  useEffect(() => {
    setEditedContent(content);
    setIsEditing(false);
    setImageFile(null);
  }, [content, open]);

  const handleSave = () => {
    if (imageUrl) {
      // Base64データURLからヘッダを除去して保存
      const base64Data = imageUrl.split(",")[1];
      onUpdateFile(path, base64Data);
    } else {
      onUpdateFile(path, editedContent);
    }
  };

  const handleCopyClick = async () => {
    const textToCopy = isEditing ? editedContent : content;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getLanguage = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase();
    const filename = path.split("/").pop()?.toLowerCase();
    if (filename === "dockerfile") return "docker";
    const map: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      jsx: "jsx",
      tsx: "tsx",
      html: "html",
      css: "css",
      scss: "scss",
      java: "java",
      py: "python",
      sql: "sql",
      md: "markdown",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      sh: "bash",
    };
    return map[ext || ""] || "plaintext";
  };

  const language = getLanguage(path);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        {/* Header */}
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
            <IconButton
              aria-label="copy"
              onClick={handleCopyClick}
              color="primary"
              sx={{ mr: 1 }}
            >
              <ContentCopyIcon />
            </IconButton>
            <IconButton aria-label="close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Main Content */}
        <DialogContent dividers sx={{ position: "relative" }}>
          {(() => {
            // --- 画像ファイル（非編集） ---
            if (isImageFile && !isEditing && content.startsWith("data:image")) {
              return (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                    backgroundColor: "#1e1e1e",
                    overflow: "hidden",
                    maxHeight: "70vh",
                  }}
                >
                  <img
                    src={content}
                    alt={path}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "70vh",
                      objectFit: "contain",
                      cursor: "zoom-in",
                      transition: "transform 0.3s ease",
                    }}
                    onClick={(e) => {
                      const img = e.currentTarget;
                      if (img.style.transform === "scale(2)") {
                        img.style.transform = "scale(1)";
                        img.style.cursor = "zoom-in";
                      } else {
                        img.style.transform = "scale(2)";
                        img.style.cursor = "zoom-out";
                      }
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      right: 16,
                      color: "#ccc",
                      fontSize: "0.8rem",
                    }}
                  >
                    クリックで拡大／縮小
                  </Box>
                </Box>
              );
            }

            // --- 編集モード（画像） ---
            if (isImageFile && isEditing) {
              return (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0])
                        setImageFile(e.target.files[0]);
                    }}
                  />
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="プレビュー"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "60vh",
                        objectFit: "contain",
                        marginTop: 8,
                      }}
                    />
                  )}
                </Box>
              );
            }

            // --- 編集モード（テキスト） ---
            if (isEditing) {
              return (
                <TextField
                  fullWidth
                  multiline
                  rows={20}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  variant="outlined"
                />
              );
            }

            // --- 通常テキスト／コード表示 ---
            return (
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{ maxHeight: "60vh" }}
              >
                {content}
              </SyntaxHighlighter>
            );
          })()}
        </DialogContent>

        {/* Footer */}
        <DialogActions>
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)}>キャンセル</Button>
              <Button onClick={handleSave}>保存</Button>
            </>
          ) : (
            isEditable && <Button onClick={() => setIsEditing(true)}>編集</Button>
          )}
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          クリップボードにコピーしました！
        </Alert>
      </Snackbar>
    </>
  );
};

export default GitHubFileViewerDialog;
