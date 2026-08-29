import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import LoginIcon from "@mui/icons-material/Login";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useNavigate } from "react-router-dom";

const APP_NAME = "ツミアゲ";

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
            {/* サイトロゴ/ブランド名であってページ本文の見出しではないため、
                見た目はh6のまま、タグはspanにしてページの見出し階層（h1→h2→h3…）を
                乱さないようにする */}
            <Typography
              variant="h6"
              component="span"
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
              startIcon={<LoginIcon />}
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
