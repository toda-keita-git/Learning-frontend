import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useToast } from "../ToastContext";
import { listInquiriesApi, updateInquiryStatusApi } from "./Api";
import type { Inquiry } from "./Api";

interface InquiryManageDialogProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_LABEL: Record<Inquiry["status"], string> = {
  new: "未対応",
  read: "確認済み",
  done: "対応済み",
};

const STATUS_COLOR: Record<Inquiry["status"], "warning" | "info" | "success"> = {
  new: "warning",
  read: "info",
  done: "success",
};

// お問い合わせの確認・ステータス更新（管理者のみ開く想定のダイアログ）
export default function InquiryManageDialog({ open, onClose }: InquiryManageDialogProps) {
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const data = await listInquiriesApi();
      setInquiries(data);
    } catch (e) {
      console.error("ERROR!! occurred in listInquiriesApi.", e);
      showToast("お問い合わせ一覧の取得に失敗しました。", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchInquiries();
  }, [open]);

  const advanceStatus = async (inquiry: Inquiry) => {
    const next = inquiry.status === "new" ? "read" : "done";
    setBusyId(inquiry.id);
    try {
      await updateInquiryStatusApi(inquiry.id, next);
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiry.id ? { ...i, status: next } : i))
      );
    } catch (e) {
      console.error("ERROR!! occurred in updateInquiryStatusApi.", e);
      showToast("ステータスの更新に失敗しました。", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>お問い合わせ管理</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
            読み込み中…
          </Typography>
        ) : inquiries.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
            お問い合わせはまだありません。
          </Typography>
        ) : (
          <List
            dense
            sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxHeight: 420, overflow: "auto" }}
          >
            {inquiries.map((inquiry, index) => (
              <Box key={inquiry.id}>
                {index > 0 && <Divider />}
                <ListItem
                  alignItems="flex-start"
                  sx={{ flexDirection: "column", gap: 0.5 }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                    <Chip size="small" color={STATUS_COLOR[inquiry.status]} label={STATUS_LABEL[inquiry.status]} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {new Date(inquiry.created_at).toLocaleString("ja-JP")}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {inquiry.name || "（名前未入力）"}（{inquiry.email}）
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {inquiry.message}
                  </Typography>
                  {inquiry.status !== "done" && (
                    <Button
                      size="small"
                      startIcon={inquiry.status === "new" ? <MarkEmailReadOutlinedIcon /> : <CheckCircleOutlineIcon />}
                      disabled={busyId === inquiry.id}
                      onClick={() => advanceStatus(inquiry)}
                      sx={{ mt: 0.5 }}
                    >
                      {inquiry.status === "new" ? "確認済みにする" : "対応済みにする"}
                    </Button>
                  )}
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
