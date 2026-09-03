import { useNavigate } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface LegalLinksDialogProps {
  open: boolean;
  onClose: () => void;
}

// 規約・ポリシーの各ページはランディングページのフッターからしか辿れず、
// アプリの中に入ってしまうと読む手段が無かったため、「その他」からも開けるようにする
const LINKS = [
  {
    to: "/terms",
    icon: <GavelOutlinedIcon color="action" />,
    label: "利用規約",
    description: "サービスの利用条件、料金プラン、免責事項",
  },
  {
    to: "/privacy",
    icon: <PrivacyTipOutlinedIcon color="action" />,
    label: "プライバシーポリシー",
    description: "取得する情報と、その使い道・保存先",
  },
  {
    to: "/tokushoho",
    icon: <ReceiptLongOutlinedIcon color="action" />,
    label: "特定商取引法に基づく表記",
    description: "販売業者、価格、返金・解約について",
  },
];

export default function LegalLinksDialog({ open, onClose }: LegalLinksDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle>規約・ポリシー</DialogTitle>
      <DialogContent dividers>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <List disablePadding>
            {LINKS.map((link, index) => (
              <ListItemButton
                key={link.to}
                onClick={() => {
                  onClose();
                  navigate(link.to);
                }}
                sx={{ borderTop: index === 0 ? "none" : "1px solid", borderColor: "divider", py: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{link.icon}</ListItemIcon>
                <ListItemText
                  primary={link.label}
                  secondary={link.description}
                  slotProps={{ primary: { fontWeight: 700 } }}
                />
                <ChevronRightOutlinedIcon fontSize="small" color="action" />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
