import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface FaqDialogProps {
  open: boolean;
  onClose: () => void;
}

// 実際に使っていて詰まりやすい点だけを載せる。
// 一般的なQ&Aを並べるとかえって読まれないため、この画面の仕組み由来の疑問に絞る
const FAQ: { q: string; a: string }[] = [
  {
    q: "目標・プラン・メモはどこに保存されますか？",
    a: "アプリのデータベースに保存されます。ログインすれば別の端末からでも同じ内容が見られます。メモに添付したファイルだけは、GitHubリポジトリかGoogleドライブのどちらかに保存されます（どちらに入っているかは、メモの添付ボタンにアイコンとラベルで表示されます）。",
  },
  {
    q: "GitHubとGoogle、どちらでログインすればよいですか？",
    a: "どちらでも同じように使えます。あとから「アカウント情報」でもう一方を連携すれば、1つのアカウントのまま両方の保存先が使えるようになります。連携しても新しいアカウントは作られず、今の記録はそのまま残ります。",
  },
  {
    q: "プランの進捗はどうやって決まりますか？",
    a: "自分で入力する必要はありません。学習用メモの習熟度、チェック用メモのチェック消化率から、そのメモが紐づくプラン、さらにその親プランへと自動的に積み上がります。対象が1件も無いプランは「未設定」と表示されます。",
  },
  {
    q: "メモとプランはどうやって紐づけますか？",
    a: "「プラン」タブの下にあるメモトレイを開き、行の左端のつまみをプランの上までドラッグするか、行の右端のリンクアイコンから紐づけ先を選びます。メモは先に作っておいて、あとから紐づけることもできます。",
  },
  {
    q: "「習慣」タブには何が出ますか？",
    a: "メモの編集画面で「繰り返し」を設定したメモが、設定した日数ごとにここへ出てきます。今日やる分だけが並ぶので、復習や日課の消し込みに使えます。",
  },
  {
    q: "オフラインでも使えますか？",
    a: "記録の閲覧・検索・習慣リストはオフラインでも使えます。登録・編集・削除も一旦保留され、オンラインに戻った時点で自動的に送信されます。初回ログインと、添付ファイルの追加・表示にはオンラインが必要です。",
  },
  {
    q: "ゲストモードのデータはログイン後も残りますか？",
    a: "残せます。ゲストモードはこの端末のブラウザ内だけに保存する仕組みですが、ログインすると「この端末の記録を取り込みますか？」と確認が出るので、取り込めばそのままアカウントの記録として引き継げます。作り直す必要はありません。",
  },
];

// フッター「その他」→「よくある質問」
export default function FaqDialog({ open, onClose }: FaqDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <QuizOutlinedIcon color="primary" />
        よくある質問
      </DialogTitle>
      <DialogContent dividers>
        {FAQ.map((item) => (
          <Accordion key={item.q} elevation={0} disableGutters sx={{ "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {item.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                {item.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
