import ResponsiveAppBar from "./component/ResponsiveAppBar";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GitHubIcon from "@mui/icons-material/GitHub";
import SearchIcon from "@mui/icons-material/Search";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";

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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<GitHubIcon />}
              onClick={() => navigate("/LearningContent")}
            >
              使ってみる（GitHubログイン）
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<SearchIcon />}
              onClick={() => navigate("/FileSearch")}
            >
              ファイルを探す
            </Button>
          </Stack>
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
