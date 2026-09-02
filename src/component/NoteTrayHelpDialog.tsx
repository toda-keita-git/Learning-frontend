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
import AddLinkIcon from "@mui/icons-material/AddLink";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { ReactNode } from "react";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface NoteTrayHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const ITEMS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <DragIndicatorIcon fontSize="small" color="action" />,
    title: "左端の⣿を持ってプランへドラッグ",
    body: "上に広がっているプランボードの行まで持っていくと「ここにリンク」、新規作成ゾーンまで持っていくと「ここで新しい目標を作成」が表示されます。指を離すとその操作が実行されます。",
  },
  {
    icon: <ArticleOutlinedIcon fontSize="small" color="action" />,
    title: "行の中央をタップして中身を読む",
    body: "トレイにはタイトルしか出ないため、行の中央をタップするとそのメモの本文・チェックリスト・添付・紐づくプランをまとめて確認できます。そのまま編集や削除もできます。",
  },
  {
    icon: <AddLinkIcon fontSize="small" color="action" />,
    title: "右端のアイコンからリンク先を選ぶ",
    body: "ドラッグが難しいときは、行の右端のリンクアイコンをタップしてください。検索付きのダイアログからリンク先のプランを選べます。「新しいプランにする」から、そのメモを元に新しい目標を作成することもできます。",
  },
  {
    icon: <FlagOutlinedIcon fontSize="small" color="action" />,
    title: "紐づけ先はタイトルの下に表示",
    body: "各行のタイトルの下に、そのメモが紐づいているプラン名が出ます。まだどこにも紐づいていないメモは「未リンク」と表示されます。",
  },
  {
    icon: <SearchIcon fontSize="small" color="action" />,
    title: "検索・種別で絞り込み",
    body: "メモが増えてきたら、検索ボックスや「学習用・チェック用・通常」の種別フィルタで絞り込めます。",
  },
  {
    icon: <CheckCircleIcon fontSize="small" color="action" />,
    title: "リンク済みの印",
    body: "今開いているプランに既にリンクされているメモには、緑のチェック印が付きます。",
  },
];

// 未整理のメモの操作方法をまとめたヘルプ。展開時に画面下半分いっぱいまで表示するため
// 説明文を常設せず、必要なときにいつでも見返せるようここへ集約する
export default function NoteTrayHelpDialog({ open, onClose }: NoteTrayHelpDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HelpOutlineIcon color="primary" />
        未整理のメモの使い方
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
