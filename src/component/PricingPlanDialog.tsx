import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import LoyaltyOutlinedIcon from "@mui/icons-material/LoyaltyOutlined";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface PricingPlanDialogProps {
  open: boolean;
  onClose: () => void;
}

// 無料プランに含まれるもの。ここに書いた内容は利用規約 第5条とも揃えること
const FREE_INCLUDED = [
  "目標・アクションプランの登録（階層の深さ・件数の制限なし）",
  "メモとプランの紐づけ、進捗の自動集計",
  "カレンダー（開始日〜期限日の帯、休みの設定）",
  "習慣リスト（繰り返し設定）と継続日数の記録",
  "今日やること・次にやることの一覧と、振り返り",
  "オフラインでの閲覧と、オンライン復帰時の自動送信",
  "GitHubリポジトリ / Googleドライブへのファイル添付",
];

// Proプランで無料プランに上乗せされるもの
const PRO_ADDED = [
  "メモ・カテゴリー・タグの件数上限なし",
  "広告の非表示",
  "習慣の記録をサーバーに保存し、複数の端末で同期",
  "目標・メモのデータエクスポート（CSV / PDF）",
  "振り返りレポートの強化（傾向グラフ・期間の比較）",
  "お問い合わせの優先対応",
];

// 登録できる件数の上限。サーバー側で実際にチェックしている値と揃えること
// （NoteController.FREE_PLAN_LIMIT / LearningController.FREE_CATEGORY_LIMIT /
//   LearningService.FREE_TAG_LIMIT）。ここに書かずに「制限なし」と案内していると、
// 上限に達した利用者が説明と食い違うエラーに突き当たることになる
const LIMITS = [
  { label: "メモ", free: "100件まで", pro: "無制限" },
  { label: "カテゴリー", free: "20件まで", pro: "無制限" },
  { label: "タグ", free: "50件まで", pro: "無制限" },
];

// フッター「その他」→「プラン」
export default function PricingPlanDialog({ open, onClose }: PricingPlanDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LoyaltyOutlinedIcon color="primary" />
        料金プラン
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* 無料プラン */}
          <Box sx={{ p: 2, borderRadius: 2, border: "2px solid", borderColor: "primary.main" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                無料プラン
              </Typography>
              <Chip label="ご利用中" size="small" color="primary" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              月額 0円
            </Typography>
            <Stack spacing={0.75}>
              {FREE_INCLUDED.map((item) => (
                <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                  <CheckCircleOutlineIcon fontSize="small" color="success" sx={{ mt: 0.25, flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Proプラン。まだ提供していないので、金額と内容の案内に留める */}
          <Box sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Proプラン
              </Typography>
              <Chip label="準備中" size="small" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              月額 480円（税込） / 年額 4,800円（税込）
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              年額は2か月分おトクになります。
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              無料プランのすべてに加えて
            </Typography>
            <Stack spacing={0.75}>
              {PRO_ADDED.map((item) => (
                <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                  <AddCircleOutlineIcon fontSize="small" color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* 件数の比較 */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              登録できる件数
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                columnGap: 2,
                rowGap: 0.75,
                alignItems: "center",
              }}
            >
              <Box />
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right", minWidth: 64 }}>
                無料
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right", minWidth: 56 }}>
                Pro
              </Typography>
              {LIMITS.map((limit) => (
                <Box key={limit.label} sx={{ display: "contents" }}>
                  <Typography variant="body2" color="text.secondary">
                    {limit.label}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: "right" }}>
                    {limit.free}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 700 }}>
                    {limit.pro}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              上限に達しても、これまでに登録した内容が消えることはありません。新しく追加できなくなるだけなので、使っていないものを削除すればまた追加できます。
            </Typography>
          </Box>

          <Alert severity="info">
            Proプランはまだ提供を開始していません。現在はすべての機能を無料プランでご利用いただけます。提供開始の時期とお支払い方法は、この画面とお問い合わせでご案内します。
          </Alert>

          <Typography variant="caption" color="text.secondary">
            添付ファイルの保存容量は、連携先であるGitHubまたはGoogleドライブ側の空き容量に依存します。
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
