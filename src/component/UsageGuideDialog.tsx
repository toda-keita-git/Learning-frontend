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
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AddLinkIcon from "@mui/icons-material/AddLink";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChecklistIcon from "@mui/icons-material/Checklist";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface UsageGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

// 画面ごとのヘルプ（プランボード・メモトレイの「?」）は個別に用意してあるので、
// ここでは「どの順番で何をする画面なのか」という全体の流れだけを扱う。
// 文章だけでは実際のどこを指しているのか分かりにくいため、各手順に実際の画面を
// 撮ったものを添える（public/usage 以下。差し替えるときは同じ名前で置き換える）
const STEPS: { icon: ReactNode; title: string; body: string; image: string; alt: string; height: number }[] = [
  {
    icon: <FlagOutlinedIcon fontSize="small" color="primary" />,
    title: "1. 目標を立てる",
    body: "「プラン」タブの「新しい目標」から、達成したいことを登録します。期限日を入れておくと、残り日数とカレンダーの帯に反映されます。",
    image: "/usage/01-board.jpg",
    height: 420,
    alt: "プランボードの画面。「新しい目標」ボタンと、進捗バー・期限つきの目標が並んでいる",
  },
  {
    icon: <AccountTreeOutlinedIcon fontSize="small" color="primary" />,
    title: "2. アクションプランに分解する",
    body: "目標をタップして開き、「子プラン（アクションプラン）」の「追加」から、やることを具体的な単位に分けます。子プランの下にさらに子プランを作ることもできます。",
    image: "/usage/02-children.jpg",
    height: 460,
    alt: "目標を開いた画面。目標の下に子プラン（アクションプラン）が並んでいる",
  },
  {
    icon: <DescriptionOutlinedIcon fontSize="small" color="primary" />,
    title: "3. メモで記録する",
    body: "「メモ」タブの「新しいメモ」から日々の取り組みを記録します。学習用は習熟度、チェック用はチェックリスト、通常は文章だけ、と用途で使い分けます。プランが決まっていなくても先に作れます。",
    image: "/usage/03-notes.jpg",
    height: 430,
    alt: "メモライブラリの画面。学習用・チェック用・通常のメモが種別のラベル付きで並んでいる",
  },
  {
    icon: <AddLinkIcon fontSize="small" color="primary" />,
    title: "4. メモをプランに紐づける",
    body: "「プラン」タブの下にある未整理のメモを開き、行の右端にあるリンクのアイコンから紐づけ先を選びます。行の中央をタップすると、メモの中身を確認できます。",
    image: "/usage/04-link.jpg",
    height: 330,
    alt: "画面下部のメモトレイ。各メモの右端にプランへ紐づけるリンクのアイコンがある",
  },
  {
    icon: <CalendarMonthOutlinedIcon fontSize="small" color="primary" />,
    title: "5. カレンダーで期間を見る",
    body: "「カレンダー」タブでは、開始日から期限日までが1本の帯で表示されます。帯の色は目標ごと、細い帯は子プランです。土日・祝日には背景色が付き、右上の設定から自分の休みに変えられます。",
    image: "/usage/05-calendar.jpg",
    height: 470,
    alt: "カレンダーの月表示。開始日から期限日までが帯で繋がり、土日と祝日に背景色が付いている",
  },
  {
    icon: <ChecklistIcon fontSize="small" color="primary" />,
    title: "6. 習慣を続ける",
    body: "メモの編集画面で「繰り返し」を設定すると、そのメモは設定した日数ごとに「習慣」タブへ出てきます。今日やる分だけが並ぶので、復習や日課の消し込みに使えます。",
    image: "/usage/06-routine.jpg",
    height: 400,
    alt: "習慣リストの画面。1日ごと・3日ごとなど、繰り返しの間隔ごとにメモが並んでいる",
  },
  {
    icon: <TodayOutlinedIcon fontSize="small" color="primary" />,
    title: "7. 進捗は自動で積み上がる",
    body: "紐づいたメモの習熟度やチェック消化率から、プラン、さらにその親へと進捗が自動計算されます。自分で進捗を入力する必要はありません。まとめてはヘッダーの「ダッシュボード」で確認できます。",
    image: "/usage/07-dashboard.jpg",
    height: 470,
    alt: "今日のダッシュボード。今日やること・7日以内の期限・平均達成率・継続日数が並んでいる",
  },
  {
    icon: <MoreHorizIcon fontSize="small" color="primary" />,
    title: "8. 振り返る・設定する",
    body: "「その他」タブに、今日やること・振り返り・設定・お問い合わせなどをまとめています。使い方に迷ったら、この画面から辿ってください。",
    image: "/usage/08-more.jpg",
    height: 430,
    alt: "その他タブの一覧。今日やること・振り返り・設定などの項目が並んでいる",
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
        <Stack spacing={3}>
          {STEPS.map((step) => (
            <Stack key={step.title} spacing={1}>
              <Stack direction="row" spacing={1.25}>
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
              {/* 実際の画面。開いたときにまとめて8枚取りに行かないようlazyにする */}
              <Box
                component="img"
                src={step.image}
                alt={step.alt}
                loading="lazy"
                sx={{
                  display: "block",
                  width: "100%",
                  maxWidth: 380,
                  mx: "auto",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  // 読み込み前に高さが変わって文章が飛ばないよう、実寸の比率を先に確保する
                  // （画像ごとに高さが違うので、1つの比率で揃えると端が切れてしまう）
                  aspectRatio: `380 / ${step.height}`,
                  bgcolor: "action.hover",
                }}
              />
            </Stack>
          ))}
          <Typography variant="caption" color="text.secondary">
            画面ごとの細かい操作は、プランボードと未整理のメモの見出しにある「?」からも確認できます。
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
