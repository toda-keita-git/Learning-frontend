import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { submitInquiryApi } from "./Api";

interface InquiryDialogProps {
  open: boolean;
  onClose: () => void;
}

// 未ログインの訪問者でも送信できる、公開のお問い合わせフォーム
export default function InquiryDialog({ open, onClose }: InquiryDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setMessage("");
      setSubmitting(false);
      setSubmitted(false);
      setError("");
    }
  }, [open]);

  const canSubmit = email.trim() && message.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await submitInquiryApi({
        name: name.trim() || undefined,
        email: email.trim(),
        message: message.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error("ERROR!! occurred in submitInquiryApi.", e);
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>お問い合わせ</DialogTitle>
      <DialogContent>
        {submitted ? (
          <Typography sx={{ py: 2 }}>
            お問い合わせを受け付けました。ご連絡ありがとうございます。
          </Typography>
        ) : (
          <>
            <TextField
              margin="dense"
              label="お名前（任意）"
              type="text"
              fullWidth
              variant="standard"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              autoFocus
              margin="dense"
              label="メールアドレス"
              type="email"
              fullWidth
              variant="standard"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="dense"
              label="お問い合わせ内容"
              type="text"
              fullWidth
              multiline
              minRows={4}
              variant="standard"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={!!error}
              helperText={error || " "}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{submitted ? "とじる" : "キャンセル"}</Button>
        {!submitted && (
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "送信中…" : "送信"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
