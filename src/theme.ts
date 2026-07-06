import { createTheme } from "@mui/material/styles";

// アプリ全体の見た目を統一するテーマ。
// 落ち着いたインディゴ＋ティールを基調に、角丸・余白・タイポグラフィを整える。
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4f46e5" }, // indigo
    secondary: { main: "#0ea5a4" }, // teal
    background: {
      default: "#f6f7fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#1f2937",
      secondary: "#6b7280",
    },
  },
  typography: {
    fontFamily: [
      '"Segoe UI"',
      "system-ui",
      '"Hiragino Sans"',
      '"Hiragino Kaku Gothic ProN"',
      '"Yu Gothic"',
      "Meiryo",
      "sans-serif",
    ].join(","),
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
          boxShadow: "0 2px 12px rgba(79,70,229,0.25)",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 9999, paddingInline: 20 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
  },
});

export default theme;
