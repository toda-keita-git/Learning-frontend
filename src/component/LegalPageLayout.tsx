import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ResponsiveAppBar from "./ResponsiveAppBar";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

interface LegalPageLayoutProps {
  title: string;
  updatedAt: string; // 例: "2026年8月29日"
  children: ReactNode;
}

// 利用規約・プライバシーポリシー・特定商取引法に基づく表記で共通のレイアウト。
// ヘッダーはロゴのみ（CTAは出さない＝ホームへの導線に集中させない）
export default function LegalPageLayout({ title, updatedAt, children }: LegalPageLayoutProps) {
  const navigate = useNavigate();
  // アプリの「その他」からも開けるようになったため、常にトップページへ送ると
  // 使っていた画面から追い出す形になる。アプリ内から来ている場合は元の画面へ戻す
  // （react-routerは履歴の位置をhistory.state.idxに持つ。取れない場合は従来どおり）
  const [cameFromApp] = useState(() => {
    try {
      const idx = (window.history.state as { idx?: number } | null)?.idx;
      return typeof idx === "number" && idx > 0;
    } catch {
      return false;
    }
  });

  return (
    <>
      <ResponsiveAppBar />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Link
          component="button"
          onClick={() => (cameFromApp ? navigate(-1) : navigate("/"))}
          underline="hover"
          sx={{ display: "inline-flex", alignItems: "center", mb: 3, color: "text.secondary" }}
        >
          <ChevronLeftIcon fontSize="small" />
          {cameFromApp ? "戻る" : "トップページへ戻る"}
        </Link>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          最終改定日: {updatedAt}
        </Typography>
        <Box
          sx={{
            "& h2": { fontSize: "1.15rem", fontWeight: 700, mt: 4, mb: 1.5 },
            "& p": { lineHeight: 1.9, mb: 1.5, color: "text.primary" },
            "& ul": { pl: 3, mb: 1.5, lineHeight: 1.9 },
            "& li": { mb: 0.5 },
            "& table": { width: "100%", borderCollapse: "collapse", mb: 2 },
            "& th, & td": {
              textAlign: "left",
              verticalAlign: "top",
              border: "1px solid",
              borderColor: "divider",
              p: 1.25,
              fontSize: "0.9rem",
            },
            "& th": { width: { sm: "30%" }, bgcolor: "action.hover", whiteSpace: "nowrap" },
          }}
        >
          {children}
        </Box>
      </Container>
    </>
  );
}
