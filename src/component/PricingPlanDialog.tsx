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
import LoyaltyOutlinedIcon from "@mui/icons-material/LoyaltyOutlined";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface PricingPlanDialogProps {
  open: boolean;
  onClose: () => void;
}

// 現状は有料プランが無く、全機能が無料。将来プランを分ける場合に備えて
// 「今どのプランなのか」を示す場所として用意している
const INCLUDED = [
  "目標・アクションプランの登録（階層の深さ・件数の制限なし）",
  "メモとプランの紐づけ、進捗の自動集計",
  "習慣リスト（繰り返し設定）と継続日数の記録",
  "今日やること・次にやることの一覧",
  "オフラインでの閲覧と、オンライン復帰時の自動送信",
  "GitHubリポジトリ / Googleドライブへのファイル添付",
];

// 登録できる件数の上限。サーバー側で実際にチェックしている値と揃えること
// （NoteController.FREE_PLAN_LIMIT / LearningController.FREE_CATEGORY_LIMIT /
//   LearningService.FREE_TAG_LIMIT）。ここに書かずに「制限なし」と案内していると、
// 上限に達した利用者が説明と食い違うエラーに突き当たることになる
const LIMITS = [
  { label: "メモ", value: "100件まで" },
  { label: "カテゴリー", value: "20件まで" },
  { label: "タグ", value: "50件まで" },
];

// フッター「その他」→「プラン」
export default function PricingPlanDialog({ open, onClose }: PricingPlanDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LoyaltyOutlinedIcon color="primary" />
        ご利用プラン
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "primary.main",
              textAlign: "center",
            }}
          >
            <Chip label="ご利用中" size="small" color="primary" sx={{ mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              無料プラン
            </Typography>
            <Typography variant="body2" color="text.secondary">
              月額 0円 / 機能はすべて使えます
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              このプランに含まれるもの
            </Typography>
            <Stack spacing={0.75}>
              {INCLUDED.map((item) => (
                <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                  <CheckCircleOutlineIcon fontSize="small" color="success" sx={{ mt: 0.25, flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              登録できる件数
            </Typography>
            <Stack spacing={0.75}>
              {LIMITS.map((limit) => (
                <Stack key={limit.label} direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    {limit.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {limit.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              上限に達しても、これまでに登録した内容が消えることはありません。新しく追加できなくなるだけなので、使っていないものを削除すればまた追加できます。
            </Typography>
          </Box>

          <Alert severity="info">
            有料プランは今のところありません。追加費用が発生する変更を行う場合は、事前にこの画面とお問い合わせでご案内します。
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
