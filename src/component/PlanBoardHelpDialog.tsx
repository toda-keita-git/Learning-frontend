import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface PlanBoardHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const ITEMS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <DragIndicatorIcon fontSize="small" color="action" />,
    title: "目標とアクションプランを1つのツリーで管理",
    body: "最上位が「目標」、その下にぶら下がる行が「アクションプラン」です。左端のつまみをドラッグすると、並べ替え・別の行の中へ入れ子（アクションプラン化）・ルートへ戻す（独立した目標にする）ができます。",
  },
  {
    icon: <SearchIcon fontSize="small" color="action" />,
    title: "検索すると祖先・子孫も一緒に表示",
    body: "タイトルで検索すると、一致した行だけでなくその親子関係も表示されるため、ツリーのどこにあるかが分かります。",
  },
  {
    icon: <DescriptionOutlinedIcon fontSize="small" color="action" />,
    title: "下の未整理のメモからリンク",
    body: "行のリンクアイコンから紐づけ先を選ぶと、メモとプランが紐付きます。ドラッグ操作にも対応していますが、スマホでは選択式がおすすめです。",
  },
  {
    icon: <TrendingUpIcon fontSize="small" color="action" />,
    title: "進捗はメモ・子プランから自動計算",
    body: "各プランの進捗は、直属のメモや子プランの進捗から自動的に積み上がって表示されます。手動での入力は不要です。",
  },
];

// プランボードの操作方法をまとめたヘルプ。初見では気付きにくいドラッグ操作や
// メモとの連携方法を、いつでも見返せるようにする
export default function PlanBoardHelpDialog({ open, onClose }: PlanBoardHelpDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HelpOutlineIcon color="primary" />
        プランボードの使い方
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {ITEMS.map((item) => (
            <Stack key={item.title} direction="row" spacing={1.25}>
              <Box sx={{ pt: 0.25 }}>{item.icon}</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.body}
                </Typography>
              </Box>
            </Stack>
          ))}
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
