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
  Typography,
  Alert as MuiAlert,
} from "@mui/material";
import type { AlertProps } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
// Prism（全言語を同梱、数百kB）ではなく PrismAsyncLight
// （言語ごとに動的import、初回表示に必要な分だけ読み込む）を使う
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getFileType } from "./getFileType";
import RichFilePreview from "./RichFilePreview";
import { useFullScreenDialog } from "./useFullScreenDialog";

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
  /** すでにデコード済みのテキスト or data:image/... URL */
  content: string;
  /** Excel/PDF/Word/PowerPoint/ZIPなどを本来の見た目で表示するための生のBase64 */
  base64Content?: string;
  isEditable: boolean;
  onUpdateFile: (path: string, newContent: string) => Promise<void>;
  /** 省データモード: 画像を自動表示せず、タップするまで読み込まない */
  dataSaverOn?: boolean;
}

const GitHubFileViewerDialog: React.FC<Props> = ({
  open,
  onClose,
  path,
  content,
  base64Content,
  isEditable,
  onUpdateFile,
  dataSaverOn = false,
}) => {
  const fullScreenDialog = useFullScreenDialog();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [imageRevealed, setImageRevealed] = useState(!dataSaverOn);

  const extension = path.split(".").pop()?.toLowerCase() || "";
  const isImageFile = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "ico", "webp"].includes(extension);
  const isVideoFile = ["mp4", "webm", "mov", "m4v", "avi", "mkv", "ogv"].includes(extension);
  // Excel/PDF/Word/PowerPoint/ZIPなどはテキストとして表示・編集すると内容が壊れるため、
  // 呼び出し元のisEditableに関わらずここでも編集不可にする（多重防御）
  const fileType = getFileType(path);
  const isPreviewUnsupported = ["excel", "pdf", "docx", "doc", "pptx", "zip-archive", "binary"].includes(fileType);
  const effectiveEditable = isEditable && !isPreviewUnsupported;

  useEffect(() => {
    setEditedContent(content);
    setIsEditing(false);
    setImageRevealed(!dataSaverOn);
  }, [content, open, dataSaverOn]);

  const handleSave = () => {
    onUpdateFile(path, editedContent);
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

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  // シンタックスハイライトの言語は、getFileTypeの全対応言語をそのまま使う
  // （isPreviewUnsupportedなファイルはここに来ないため、image/video/excel等の
  // 値がlanguageとして渡ることはない）
  const language = fileType;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreenDialog}>
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
            <IconButton aria-label="copy" onClick={handleCopyClick} color="primary" sx={{ mr: 1 }}>
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
            // 画像・動画ファイル（編集不可）
            if (isImageFile || isVideoFile) {
              if (!imageRevealed) {
                return (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      py: 6,
                      backgroundColor: "#1e1e1e",
                      color: "#ccc",
                    }}
                  >
                    <Typography variant="body2">
                      省データモードのため、{isVideoFile ? "動画" : "画像"}はまだ表示していません
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setImageRevealed(true)}
                      sx={{ color: "#fff", borderColor: "#666" }}
                    >
                      {isVideoFile ? "動画を表示する" : "画像を表示する"}
                    </Button>
                  </Box>
                );
              }

              if (isVideoFile) {
                return (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#1e1e1e",
                      overflow: "hidden",
                      maxHeight: "70vh",
                    }}
                  >
                    <video
                      src={content}
                      controls
                      style={{
                        maxWidth: "100%",
                        maxHeight: "70vh",
                      }}
                    >
                      お使いのブラウザは動画再生に対応していません。
                    </video>
                  </Box>
                );
              }

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

            // Excel/PDF/Word/PowerPoint/ZIPなどは、本来に近い見た目で表示する（編集は常に不可）
            if (isPreviewUnsupported) {
              if (base64Content) {
                return <RichFilePreview path={path} base64Content={base64Content} />;
              }
              return (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    py: 6,
                    px: 2,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    このファイル形式はここではプレビュー・編集できません。
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ファイルはGitHub上にそのまま保存されています。内容を確認したい場合はGitHub上で開いてください。
                  </Typography>
                </Box>
              );
            }

            // テキスト／コード
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
          {effectiveEditable && !isImageFile && !isVideoFile && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>編集</Button>
          )}
          {isEditing && (
            <>
              <Button onClick={() => setIsEditing(false)}>キャンセル</Button>
              <Button onClick={handleSave}>保存</Button>
            </>
          )}
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert severity="success" sx={{ width: "100%" }}>
          クリップボードにコピーしました！
        </Alert>
      </Snackbar>
    </>
  );
};

export default GitHubFileViewerDialog;
