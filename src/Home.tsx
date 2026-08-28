import { useRef, useState } from "react";
import ResponsiveAppBar from "./component/ResponsiveAppBar";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import { alpha } from "@mui/material/styles";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import LoginIcon from "@mui/icons-material/Login";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import InquiryDialog from "./component/InquiryDialog";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { isStorageAvailable, detectPlatformHint } from "./component/guestPlanStorage";
import { loadPersistedSession } from "./component/authStorage";

const features = [
  {
    icon: <FlagOutlinedIcon fontSize="large" color="primary" />,
    title: "目標を何段でも分解できる",
    desc: "最終目標の下にアクションプランをぶら下げ、さらにその下にも分解できます。段数の制限はなく、1つのツリーとして全体を見渡せます。",
  },
  {
    icon: <InsightsOutlinedIcon fontSize="large" color="primary" />,
    title: "進捗の自動集計",
    desc: "メモの習熟度・チェック消化率から、アクションプラン→目標の達成率を自動で計算。手動更新は不要です。",
  },
  {
    icon: <DragIndicatorIcon fontSize="large" color="primary" />,
    title: "ドラッグ&ドロップで整理",
    desc: "プランはドラッグして並べ替え・入れ替え・入れ子化ができます。メモトレイからプランへドラッグすれば、その場で紐づけられます。",
  },
  {
    icon: <PlaylistAddCheckIcon fontSize="large" color="primary" />,
    title: "チェックリスト付きメモ",
    desc: "チェック用メモにはチェック付きのtodoを持たせられ、チェックした割合がそのまま進捗度になります。",
  },
  {
    icon: <TodayOutlinedIcon fontSize="large" color="primary" />,
    title: "今日やること・次にやる事",
    desc: "目標ごとに、今日が期限の習慣メモと、まだ終わっていないアクションプランを一覧できます。次に何をするか迷いません。",
  },
  {
    icon: <ChecklistIcon fontSize="large" color="primary" />,
    title: "習慣リストと継続日数",
    desc: "メモに「繰り返し」を設定すると、指定した日数ごとに習慣リストへ出てきます。続いた日数も記録されます。",
  },
  {
    icon: <LinkOutlinedIcon fontSize="large" color="primary" />,
    title: "メモは後からでも紐付けOK",
    desc: "アクションプランが決まっていなくてもメモは作成でき、あとから紐付け先を選べます。1つのメモを複数のプランに紐づけることもできます。",
  },
  {
    icon: <AttachFileIcon fontSize="large" color="primary" />,
    title: "ファイル添付はGitHub / Googleドライブ",
    desc: "メモに画像やコード、資料を添付できます。保存先はGitHubリポジトリかGoogleドライブから選べ、どちらに入っているかがメモ上に表示されます。",
  },
  {
    icon: <WifiOffIcon fontSize="large" color="primary" />,
    title: "オフラインでも記録できる",
    desc: "通信が無くても閲覧・検索・記録ができ、オンラインに戻った時点で自動的に送信されます。スマホにインストールしてアプリのように使えます。",
  },
  {
    icon: <LocalOfferOutlinedIcon fontSize="large" color="primary" />,
    title: "カテゴリ・タグ管理",
    desc: "メモをカテゴリとタグで整理。あとから素早く探し出せます。",
  },
];

const steps = [
  {
    no: "1",
    title: "GitHubかGoogleでログイン",
    desc: "「無料ではじめる」を押すと、GitHubとGoogleのどちらでログインするかを選べます。このサイト用のアカウント登録やパスワードの設定は不要です。",
  },
  {
    no: "2",
    title: "目標とアクションプランを設定",
    desc: "最終目標を立て、それを達成するためのアクションプランを分解して登録します。アクションプランは何段でも入れ子にでき、ドラッグで並べ替えられます。",
  },
  {
    no: "3",
    title: "メモで日々の取り組みを記録",
    desc: "学習用・チェック用・通常の3種類のメモで取り組みを記録し、メモトレイからプランへ紐づけます。進捗は紐づいたメモから自動で積み上がります。",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [storageWarningOpen, setStorageWarningOpen] = useState(false);
  const stepsRef = useRef<HTMLDivElement>(null);

  // ゲストモードはこの端末のlocalStorageだけで完結するため、シークレット/
  // プライベートブラウジングなどで保存できない環境では入る前に案内する
  const handleTryGuestMode = () => {
    if (isStorageAvailable()) {
      navigate("/guest");
    } else {
      setStorageWarningOpen(true);
    }
  };

  // 既にGitHubでログイン済みの人には、アカウント登録不要のゲストモード導線は不要
  const isAlreadyLoggedIn = !!loadPersistedSession();

  const platformHint = detectPlatformHint();
  const storageWarningDetail =
    platformHint === "ios"
      ? "iPhoneやiPadのSafariで「プライベートブラウズ」中の場合、通常のタブに切り替えてからお試しください。"
      : platformHint === "android"
      ? "Androidのブラウザで「シークレットタブ」中の場合、通常のタブに切り替えてからお試しください。"
      : "シークレットウィンドウ／プライベートブラウジング中の場合、通常のウィンドウに切り替えてからお試しください。";

  return (
    <>
      <ResponsiveAppBar
        ctaLabel={isAlreadyLoggedIn ? "アプリを開く" : "使ってみる"}
        onCtaClick={() => navigate("/LearningContent")}
      />

      {/* ヒーロー */}
      <Box
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.18 : 0.08
            )} 0%, ${theme.palette.background.default} 60%)`,
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <FlagOutlinedIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            目標達成支援
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "text.secondary", fontWeight: 400, mb: 4 }}
          >
            最終目標をアクションプランに分解し、日々のメモで積み上げる。
            <br />
            進捗は自動で集計され、やることがいつも明確なままです。
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            {/* ログイン画面ではGitHub / Google の2つから選べる。ここで「GitHubログイン」と
                書いてしまうと、押した先で選択肢が2つ出て戸惑わせるため、
                ボタン側では提供元を名指ししない */}
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate("/LearningContent")}
            >
              {isAlreadyLoggedIn ? "アプリを開く" : "無料ではじめる"}
            </Button>
            {!isAlreadyLoggedIn && (
              <Button variant="outlined" size="large" onClick={handleTryGuestMode}>
                アカウント登録なしで試す
              </Button>
            )}
          </Stack>
          <Typography sx={{ mt: 2 }}>
            <Box
              component="button"
              onClick={() => stepsRef.current?.scrollIntoView({ behavior: "smooth" })}
              sx={{
                border: "none",
                background: "none",
                color: "primary.main",
                cursor: "pointer",
                font: "inherit",
                textDecoration: "underline",
                p: 0,
              }}
            >
              まずは使い方を見る
            </Box>
          </Typography>
        </Container>
      </Box>

      {/* つかいかた（3ステップ） */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }} ref={stepsRef}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, textAlign: "center", mb: 1 }}
        >
          つかいかた
        </Typography>
        <Typography
          sx={{ color: "text.secondary", textAlign: "center", mb: 4 }}
        >
          3ステップで、学びの記録と振り返りが始められます。
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          {steps.map((s) => (
            <Paper
              key={s.no}
              elevation={0}
              sx={{ flex: 1, p: 4, border: "1px solid", borderColor: "divider" }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  color: "#fff",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                {s.no}
              </Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {s.title}
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>{s.desc}</Typography>
            </Paper>
          ))}
        </Stack>
      </Container>

      {/* ログインと保存先について（やさしい説明＋詳細はアコーディオンに格納） */}
      <Box sx={{ bgcolor: "action.hover", py: { xs: 5, md: 7 } }}>
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              border: "1px solid",
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
              <LockOutlinedIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                なぜログインが必要なの？
              </Typography>
            </Stack>
            <Typography sx={{ mb: 1, lineHeight: 1.9 }}>
              ログインすると、書いた目標・アクションプラン・メモが<b>あなた専用の記録</b>として保存され、
              スマホでもパソコンでも同じ内容を続きから使えます。ログインには<b>GitHub</b>と<b>Google</b>のどちらかを使います。
              このサイト用に新しくアカウントを作ったり、パスワードを決めたりする必要はありません。
            </Typography>
            {/* 狭い画面ではrowのまま折り返すと2行目だけ字下がりして見えるので、縦に積む */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} sx={{ my: 2 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <GitHubIcon fontSize="small" />
                <Typography variant="body2">GitHubでログイン</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <GoogleIcon fontSize="small" />
                <Typography variant="body2">Googleでログイン</Typography>
              </Stack>
            </Stack>
            <Typography sx={{ mb: 2, lineHeight: 1.9, color: "text.secondary" }}>
              どちらを選んでも機能は同じです。あとから「その他 → アカウント情報」でもう一方を連携すれば、
              1つのアカウントのまま両方を使えるようになります（連携しても記録は消えません）。
              なお、メモに添付したファイルだけは、あなたのGitHubリポジトリかGoogleドライブに保存されます。
              念のため、パスワードなどの重要な情報は書かないようにしてください。
            </Typography>

            <Accordion elevation={0} disableGutters sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600 }}>
                  もう少し詳しく知りたい方はこちら（技術的な内容を含みます）
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0 }}>
                <Box component="ul" sx={{ m: 0, pl: 3, color: "text.secondary", lineHeight: 2 }}>
                  <li>
                    目標・アクションプラン・メモの本文は、このアプリのデータベースに保存されます。
                    GitHubやGoogleは、ログインの本人確認と、次の「添付ファイルの置き場所」として使います。
                  </li>
                  <li>
                    GitHubでログインすると、
                    <Box
                      component="code"
                      sx={{
                        mx: 0.5,
                        px: 1,
                        py: 0.3,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                        borderRadius: 1,
                        fontFamily: "monospace",
                        color: "primary.main",
                      }}
                    >
                      learning-site-&lt;ユーザー名&gt;
                    </Box>
                    という<b>非公開（Private）</b>のリポジトリが自動で用意され、メモに添付した画像やコードがそこに保存されます。
                    このリポジトリは手動で削除・改名しないでください。
                  </li>
                  <li>
                    Googleでログインすると、あなたのGoogleドライブに<b>このアプリ専用のフォルダ</b>が作られ、添付ファイルはそこに保存されます。
                    要求する権限は
                    <Box component="code" sx={{ mx: 0.5, fontFamily: "monospace", color: "primary.main" }}>
                      drive.file
                    </Box>
                    のみで、<b>このアプリが作成したファイル以外は読み書きできません</b>。ドライブ内の既存のファイルは見えません。
                  </li>
                  <li>
                    GitHubのログイン時には<b>「repo」という権限</b>の許可を求められます。上記の保存場所を作ったり、内容を更新したりするために必要な権限です。
                  </li>
                  <li>
                    添付ファイルがGitHubとGoogleのどちらに入っているかは、メモの添付ボタンにアイコンとラベルで表示されます。
                    両方を連携している場合は、メモを書くときに保存先を選べます。
                  </li>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Container>
      </Box>

      {/* オンライン・オフラインの違い */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, textAlign: "center", mb: 1 }}
        >
          オンライン・オフラインの違い
        </Typography>
        <Typography sx={{ color: "text.secondary", textAlign: "center", mb: 4 }}>
          通信が無い状態でも、多くの操作はそのまま続けられます。
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Paper
            variant="outlined"
            sx={{ flex: 1, borderRadius: 3, overflow: "hidden" }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
              }}
            >
              <CloudSyncIcon color="success" fontSize="small" />
              <Typography sx={{ fontWeight: 700, color: "success.main" }}>
                オフラインでもできること
              </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                プラン・メモの閲覧、タイトル/本文/タグでの検索、習慣リスト、今日やること・次にやる事の確認。
                プラン・メモの登録・編集・削除も一旦保留され、次にオンラインに戻った瞬間（アプリを開き直したときも含む）に自動で送信されます。
              </Typography>
            </Box>
          </Paper>
          <Paper
            variant="outlined"
            sx={{ flex: 1, borderRadius: 3, overflow: "hidden" }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.14),
              }}
            >
              <WifiOffIcon color="warning" fontSize="small" />
              <Typography sx={{ fontWeight: 700, color: "warning.main" }}>
                オンラインが必要なこと
              </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                初回ログイン、アカウント連携、添付ファイル（GitHubリポジトリ・Googleドライブ）の追加・表示、カテゴリー・タグの作成・編集・削除。
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </Container>

      {/* 機能紹介 */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, textAlign: "center", mb: 1 }}
        >
          無料で使える主な機能
        </Typography>
        <Typography sx={{ color: "text.secondary", textAlign: "center", mb: 4 }}>
          下記はすべて無料プランに含まれています。追加費用はかかりません。
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
            gap: 3,
          }}
        >
          {features.map((f) => (
            <Paper
              key={f.title}
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                border: "1px solid",
                borderColor: "divider",
                transition: "transform .2s, box-shadow .2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: (theme) =>
                    `0 12px 28px ${alpha(theme.palette.primary.main, 0.12)}`,
                },
              }}
            >
              <Box sx={{ mb: 1.5 }}>{f.icon}</Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {f.title}
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>{f.desc}</Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* お問い合わせ */}
      <Box sx={{ bgcolor: "action.hover", py: { xs: 4, md: 5 } }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            ご不明な点やご要望があれば、お気軽にお問い合わせください。
          </Typography>
          <Button
            variant="outlined"
            startIcon={<MailOutlineIcon />}
            onClick={() => setInquiryOpen(true)}
          >
            お問い合わせ
          </Button>
        </Container>
      </Box>

      <InquiryDialog open={inquiryOpen} onClose={() => setInquiryOpen(false)} />

      <Dialog open={storageWarningOpen} onClose={() => setStorageWarningOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          この端末では保存できません
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }}>
            ゲストモードは、この端末のブラウザ内に記録を保存する仕組みです。今の状態では保存ができないようです。
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>{storageWarningDetail}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStorageWarningOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
