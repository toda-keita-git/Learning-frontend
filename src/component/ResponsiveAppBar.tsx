import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import GitHubIcon from "@mui/icons-material/GitHub";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useNavigate } from "react-router-dom";

const APP_NAME = "学習ログ";

type ResponsiveAppBarProps = {
  // ランディングページ（Home）など、下にスクロールしてもCTAへ戻れるようにしたい
  // 画面だけで使う。他画面（ゲストモードなど）では表示しない
  ctaLabel?: string;
  onCtaClick?: () => void;
};

// ヘッダーはロゴ＋（あれば）CTAボタンのみ。長いランディングページでも
// スクロール追従（sticky）させ、いつでも「使ってみる」に戻れるようにする
function ResponsiveAppBar({ ctaLabel, onCtaClick }: ResponsiveAppBarProps) {
  const navigate = useNavigate();

  return (
    <AppBar position="sticky" sx={{ top: 0 }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          <Box
            onClick={() => navigate("/")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <MenuBookIcon />
            <Typography
              variant="h6"
              noWrap
              sx={{ fontWeight: 700, letterSpacing: ".08rem", color: "inherit" }}
            >
              {APP_NAME}
            </Typography>
          </Box>
          {ctaLabel && onCtaClick && (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<GitHubIcon />}
              onClick={onCtaClick}
              sx={{ whiteSpace: "nowrap" }}
            >
              {ctaLabel}
            </Button>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default ResponsiveAppBar;
