import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DashboardOverview from "./DashboardOverview";
import { useFullScreenDialog } from "./useFullScreenDialog";
import type { Note, Plan } from "./PlanTypes";

interface DashboardDialogProps {
  open: boolean;
  onClose: () => void;
  plans: Plan[];
  notes: Note[];
  userId: number | null;
  currentStreak: number;
  onOpenToday: () => void;
  onOpenSummary: () => void;
  onOpenNote: (note: Note) => void;
}

// ヘッダーのボタンから開くダッシュボード。以前はプランボードの先頭に
// 常に置いていたが、プランを見に来たときに毎回スクロールで押しのける形に
// なっていたため、見たいときだけ開ける場所へ移した
export default function DashboardDialog({ open, onClose, ...overviewProps }: DashboardDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  const { plans } = overviewProps;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle>今日のダッシュボード</DialogTitle>
      <DialogContent dividers>
        {plans.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            まだ目標がありません。プランボードで目標を作ると、ここに今日やることや達成率がまとまります。
          </Typography>
        ) : (
          <DashboardOverview {...overviewProps} />
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
