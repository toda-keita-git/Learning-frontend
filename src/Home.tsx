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
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GitHubIcon from "@mui/icons-material/GitHub";
import SearchIcon from "@mui/icons-material/Search";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import InquiryDialog from "./component/InquiryDialog";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import recordDialogEditShot from "./assets/screenshots/record-dialog-edit.webp";
import recordDialogPreviewShot from "./assets/screenshots/record-dialog-preview.webp";
import searchResultsShot from "./assets/screenshots/search-results.webp";
import { isStorageAvailable, detectPlatformHint } from "./component/guestStorage";

const features = [
  {
    icon: <AddCircleOutlineIcon fontSize="large" color="primary" />,
    title: "学習記録",
    desc: "登録・編集・削除はいつでも無料。フリープランでも100件まで記録できます。",
  },
  {
    icon: <LocalOfferIcon fontSize="large" color="primary" />,
    title: "カテゴリ・タグ管理",
    desc: "学んだ内容をカテゴリとタグで整理。あとから素早く探し出せます。",
  },
  {
    icon: <SearchIcon fontSize="large" color="primary" />,
    title: "学習内容の検索",
    desc: "タイトルやタグから、過去の学びをチャット形式で振り返れます。",
  },
  {
    icon: <HubOutlinedIcon fontSize="large" color="primary" />,
    title: "関連する過去の記録",
    desc: "記録の詳細を開くと、タグ・カテゴリー・タイトルが似ている過去の記録を自動で表示します。",
  },
  {
    icon: <GitHubIcon fontSize="large" color="primary" />,
    title: "GitHub連携",
    desc: "専用リポジトリが自動作成され、コードと記録を一緒に管理できます。",
  },
  {
    icon: <MenuBookOutlinedIcon fontSize="large" color="primary" />,
    title: "今日の復習",
    desc: "3分・10分・じっくりから選べる、スキマ時間モード。忘れかけている記録から順に思い出せます。",
  },
  {
    icon: <LocalOfferOutlinedIcon fontSize="large" color="primary" />,
    title: "穴埋め復習",
    desc: "メモの中で[[ ]]で囲んだ語句だけを隠して確認できます。",
  },
  {
    icon: <LocalFireDepartmentIcon sx={{ fontSize: 40, color: "#f97316" }} />,
    title: "学習の記録",
    desc: "連続で記録した日数を、GitHubの「草」のようなグラフで振り返れます。",
  },
];

const steps = [
  {
    no: "1",
    title: "GitHubでログイン",
    desc: "「使ってみる」を押すとGitHub認証へ。初回ログイン時に、あなた専用の保存先リポジトリが自動で用意されます。",
  },
  {
    no: "2",
    title: "学んだことを記録",
    desc: "「新規学習記録」から、タイトル・カテゴリ・タグ・理解度・参考リンクを登録。GitHub上のコードも紐づけられます。",
  },
  {
    no: "3",
    title: "検索して振り返る",
    desc: "「学習内容検索」で、タイトルやタグから過去の学びをすぐに呼び出し。詳細は必要な1件だけ開いて確認できます。",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [storageWarningOpen, setStorageWarningOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
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

  const platformHint = detectPlatformHint();
  const storageWarningDetail =
    platformHint === "ios"
      ? "iPhoneやiPadのSafariで「プライベートブラウズ」中の場合、通常のタブに切り替えてからお試しください。"
      : platformHint === "android"
      ? "Androidのブラウザで「シークレットタブ」中の場合、通常のタブに切り替えてからお試しください。"
      : "シークレットウィンドウ／プライベートブラウジング中の場合、通常のウィンドウに切り替えてからお試しください。";

  return (
    <>
      <ResponsiveAppBar />

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
          <MenuBookIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            学習ログ
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: "text.secondary", fontWeight: 400, mb: 4 }}
          >
            学んだことを「メモ」と「GitHub上のコード」で結びつけて記録し、
            <br />
            あとからいつでも振り返れる学習記録アプリ。
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<GitHubIcon />}
              onClick={() => navigate("/LearningContent")}
            >
              使ってみる（GitHubログイン）
            </Button>
            <Button variant="outlined" size="large" onClick={handleTryGuestMode}>
              アカウント登録なしで試す
            </Button>
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

      {/* 実際の画面（文章だけでは伝わりにくいので、実際のUIをそのまま見せる） */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, textAlign: "center", mb: 1 }}>
          実際の画面
        </Typography>
        <Typography sx={{ color: "text.secondary", textAlign: "center", mb: 4 }}>
          文章だけでは伝わりにくいので、実際の画面をそのままお見せします。
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            gap: 3,
          }}
        >
          {[
            {
              src: recordDialogEditShot,
              alt: "学んだことを記録するフォームの画面。タイトル・見出し・Markdown記法と[[ ]]を使った内容メモ・参考URL2件・カテゴリ・ハッシュタグ3件・理解度・添付ファイルまで、すべての項目に入力例が入っている",
              title: "学んだことをその場で記録",
              desc: "タイトルとメモを書くだけでOK。カテゴリ・タグ・理解度・参考URL・ファイル添付などは、必要な項目だけ入力できます。",
            },
            {
              src: recordDialogPreviewShot,
              alt: "内容メモのプレビュー画面。Markdown記法が見出しや箇条書きとして整形され、[[ ]]で囲んだ部分が伏字になって表示されている",
              title: "Markdown記法と穴埋め復習",
              desc: "メモはMarkdownで整形して見やすく。[[ ]]で囲んだ語句は復習時に伏字になり、思い出す練習ができます。",
            },
            {
              src: searchResultsShot,
              alt: "検索結果の画面。登録済みの学習記録3件がカード形式に並び、そのうち1件だけ詳細を見るが開かれ、メモ・参考リンク・添付ファイル・編集削除ボタンまで表示されている",
              title: "チャット感覚で検索・振り返り",
              desc: "キーワードを送るだけで、過去の学びがカードになって出てきます。気になる1件だけ開いて確認できます。",
            },
          ].map((shot) => (
            <Paper key={shot.title} elevation={0} sx={{ border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
              <Box
                onClick={() => setLightbox({ src: shot.src, alt: shot.alt })}
                sx={{
                  position: "relative",
                  cursor: "zoom-in",
                  "&:hover .zoom-hint": { opacity: 1 },
                }}
              >
                <Box component="img" src={shot.src} alt={shot.alt} sx={{ display: "block", width: "100%" }} />
                <Box
                  className="zoom-hint"
                  sx={{
                    position: "absolute",
                    pointerEvents: "none",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0,0,0,0.35)",
                    opacity: 0,
                    transition: "opacity .15s",
                  }}
                >
                  <ZoomInIcon sx={{ color: "#fff", fontSize: 40 }} />
                </Box>
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{shot.title}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {shot.desc}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* GitHubログインについて（やさしい説明＋詳細はアコーディオンに格納） */}
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
              <GitHubIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                なぜGitHubのログインが必要なの？
              </Typography>
            </Stack>
            <Typography sx={{ mb: 1, lineHeight: 1.9 }}>
              GitHubでログインすると、<b>あなた専用の保存場所</b>が自動で用意され、書いた学習記録を無料でずっと保存しておけます。
              難しい設定は不要で、むずかしいことが分からなくても大丈夫です。ボタンを押すだけで準備が整います。
            </Typography>
            <Typography sx={{ mb: 2, lineHeight: 1.9, color: "text.secondary" }}>
              その保存場所は他の人には見えない非公開の状態で作られるので、安心して使えます（念のため、パスワードなどの重要な情報は書かないようにしてください）。
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
                    保存場所の正体は、GitHubの
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
                    という名前の「リポジトリ」（GitHub用語でファイル置き場のこと）です。学習記録に添付したコードやファイルは、ここに保存されます。
                  </li>
                  <li>
                    作成されるリポジトリは<b>非公開（Private）</b>です。あなたと、あなたが許可した相手だけが閲覧できます。
                  </li>
                  <li>
                    ログイン時に、GitHubから<b>「repo」という権限</b>の許可を求められます。これは上記の保存場所を作ったり、内容を更新したりするために必要な権限です。
                  </li>
                  <li>
                    この
                    <Box
                      component="code"
                      sx={{ fontFamily: "monospace", color: "primary.main" }}
                    >
                      learning-site-…
                    </Box>
                    リポジトリは、アプリのデータ保存に使われます。手動で削除・改名しないでください。
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
                記録の閲覧・タイトル検索・タグ絞り込み・今日の復習・学習分析ダッシュボード。
                記録の登録・編集・削除も一旦保留され、次にオンラインに戻った瞬間（アプリを開き直したときも含む）に自動で送信されます。
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
                初回ログイン、GitHubファイルの添付・プレビュー・編集、カテゴリー・タグの作成・編集・削除。
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
          いつでも無料でお使いいただけます（学習記録はフリープランで100件まで）。
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

      {/* スクリーンショットの拡大表示 */}
      <Dialog
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: "transparent", boxShadow: "none" } }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setLightbox(null)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(0,0,0,0.5)",
              color: "#fff",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <CloseIcon />
          </IconButton>
          {lightbox && (
            <Box
              component="img"
              src={lightbox.src}
              alt={lightbox.alt}
              onClick={() => setLightbox(null)}
              sx={{
                display: "block",
                width: "100%",
                height: "auto",
                borderRadius: 1,
                cursor: "zoom-out",
              }}
            />
          )}
        </Box>
      </Dialog>
    </>
  );
}
