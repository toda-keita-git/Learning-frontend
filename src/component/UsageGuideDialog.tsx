import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AddLinkIcon from "@mui/icons-material/AddLink";
import ChecklistIcon from "@mui/icons-material/Checklist";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface UsageGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

// 画面ごとのヘルプ（プランボード・メモトレイの「?」）は個別に用意してあるので、
// ここでは「どの順番で何をする画面なのか」という全体の流れだけを扱う
const STEPS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <FlagOutlinedIcon fontSize="small" color="primary" />,
    title: "1. 目標を立てる",
    body: "「プラン」タブの「新しい目標」から、達成したいことを登録します。目標の下には、その行の「＋」からアクションプランを何段でもぶら下げられます。",
  },
  {
    icon: <DescriptionOutlinedIcon fontSize="small" color="primary" />,
    title: "2. メモで記録する",
    body: "「メモ」タブの「新しいメモ」から日々の取り組みを記録します。学習用は習熟度、チェック用はチェックリスト、通常は文章だけ、と用途で使い分けます。プランが決まっていなくても先に作れます。",
  },
  {
    icon: <AddLinkIcon fontSize="small" color="primary" />,
    title: "3. メモをプランに紐づける",
    body: "「プラン」タブの下にあるメモトレイを開き、行の左端のつまみをプランの上までドラッグするか、右端のリンクアイコンから紐づけ先を選びます。行の中央をタップすると、メモの中身を確認できます。",
  },
  {
    icon: <TrendingUpIcon fontSize="small" color="primary" />,
    title: "4. 進捗は自動で積み上がる",
    body: "紐づいたメモの習熟度やチェック消化率から、プラン、さらにその親のプランへと進捗が自動計算されます。自分で進捗を入力する必要はありません。",
  },
  {
    icon: <TodayOutlinedIcon fontSize="small" color="primary" />,
    title: "5. 今日やること・次にやる事",
    body: "ヘッダーのカレンダーアイコンから、目標ごとの「今日やること」（今日が期限の習慣メモ）と「次にやる事」（まだ完了していないアクションプラン）をまとめて確認できます。",
  },
  {
    icon: <ChecklistIcon fontSize="small" color="primary" />,
    title: "6. 習慣を続ける",
    body: "メモの編集画面で「繰り返し」を設定すると、そのメモは設定した日数ごとに「習慣」タブへ出てきます。今日やる分だけが並ぶので、復習や日課の消し込みに使えます。",
  },
];

// フッター「その他」→「使い方」
export default function UsageGuideDialog({ open, onClose }: UsageGuideDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <MenuBookIcon color="primary" />
        使い方
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {STEPS.map((step) => (
            <Stack key={step.title} direction="row" spacing={1.25}>
              <Box sx={{ pt: 0.25 }}>{step.icon}</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                  {step.body}
                </Typography>
              </Box>
            </Stack>
          ))}
          <Typography variant="caption" color="text.secondary">
            画面ごとの細かい操作は、プランボードとメモトレイの見出しにある「?」からも確認できます。
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
