import ResponsiveAppBar from "./component/ResponsiveAppBar";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GitHubIcon from "@mui/icons-material/GitHub";
import SearchIcon from "@mui/icons-material/Search";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const features = [
  {
    icon: <GitHubIcon fontSize="large" color="primary" />,
    title: "GitHub連携",
    desc: "OAuthでログインし、学習メモを自分のリポジトリのコードと紐づけて残せます。",
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
    desc: "「新規学習内容」から、タイトル・カテゴリ・タグ・理解度・参考リンクを登録。GitHub上のコードも紐づけられます。",
  },
  {
    no: "3",
    title: "検索して振り返る",
    desc: "「学習内容検索」で、タイトルやタグから過去の学びをすぐに呼び出し。詳細は必要な1件だけ開いて確認できます。",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <ResponsiveAppBar />

      {/* ヒーロー */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #eef2ff 0%, #f6f7fb 60%)",
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
          <Button
            variant="contained"
            size="large"
            startIcon={<GitHubIcon />}
            onClick={() => navigate("/LearningContent")}
          >
            使ってみる（GitHubログイン）
          </Button>
        </Container>
      </Box>

      {/* つかいかた（3ステップ） */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
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
              sx={{ flex: 1, p: 4, border: "1px solid #eceef3" }}
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

      {/* GitHub連携について（リポジトリ自動作成の説明＋注意点） */}
      <Box sx={{ bgcolor: "#f9fafe", py: { xs: 5, md: 7 } }}>
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{ p: { xs: 3, md: 4 }, border: "1px solid #e0e7ff" }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
              <GitHubIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                GitHub連携について
              </Typography>
            </Stack>
            <Typography sx={{ mb: 2, lineHeight: 1.9 }}>
              初回ログイン時に、あなたのGitHubアカウントへ
              <Box
                component="code"
                sx={{
                  mx: 0.5,
                  px: 1,
                  py: 0.3,
                  bgcolor: "#eef2ff",
                  borderRadius: 1,
                  fontFamily: "monospace",
                  color: "primary.main",
                }}
              >
                learning-site-&lt;ユーザー名&gt;
              </Box>
              という保存先リポジトリが自動で作成されます。学習記録に添付したコードやファイルは、ここに保存されます。
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <InfoOutlinedIcon fontSize="small" sx={{ color: "#b45309" }} />
              <Typography sx={{ fontWeight: 700, color: "#b45309" }}>
                ご利用前の注意点
              </Typography>
            </Stack>
            <Box component="ul" sx={{ m: 0, pl: 3, color: "text.secondary", lineHeight: 2 }}>
              <li>
                作成されるリポジトリは<b>非公開（Private）</b>です。あなたと、あなたが許可した相手だけが閲覧できます。
                とはいえ念のため、<b>パスワードやAPIキーなどの機密情報は保存しない</b>ことをおすすめします。
              </li>
              <li>
                ログイン時に、GitHubの<b>「repo（リポジトリの読み書き）」権限</b>の許可を求められます。
                これは上記の保存先リポジトリを作成・更新するために使用します。
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
          </Paper>
        </Container>
      </Box>

      {/* 機能紹介 */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          justifyContent="center"
        >
          {features.map((f) => (
            <Paper
              key={f.title}
              elevation={0}
              sx={{
                flex: 1,
                p: 4,
                textAlign: "center",
                border: "1px solid #eceef3",
                transition: "transform .2s, box-shadow .2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 28px rgba(79,70,229,0.12)",
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
        </Stack>
      </Container>
    </>
  );
}
