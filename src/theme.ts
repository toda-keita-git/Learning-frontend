import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

// アプリ全体の見た目を統一するテーマ。
// 落ち着いたインディゴ＋ティールを基調に、角丸・余白・タイポグラフィを整える。
// mode（"light" / "dark"）を受け取り、ダークモードにも対応する。
export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: "#4f46e5" }, // indigo
      secondary: { main: "#0ea5a4" }, // teal
      ...(mode === "light"
        ? {
            background: {
              default: "#f6f7fb",
              paper: "#ffffff",
            },
            text: {
              primary: "#1f2937",
              secondary: "#6b7280",
            },
          }
        : {
            // 夜間のスマホ学習に優しい、目にやさしい濃紺ベースのダーク配色
            background: {
              default: "#0f172a",
              paper: "#1e293b",
            },
            text: {
              primary: "#e5e7eb",
              secondary: "#94a3b8",
            },
          }),
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
            backgroundImage:
              "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)",
            boxShadow: "0 2px 12px rgba(79,70,229,0.25)",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 9999,
            paddingInline: 20,
            // ボタンのラベルは途中で折り返さない。スマホの狭い幅で横並びにすると
            // ボタンが縮められ、「画像を選/ぶ」のように語の途中で改行されて
            // 読みにくくなるため。入りきらない場合は、置いている側のStackを
            // flexWrapで折り返して次の行に送る
            whiteSpace: "nowrap",
          },
          // size="small"のボタンは横並びで使うことが多く、既定の余白(20px)のままだと
          // 文字に回せる幅が足りなくなりやすいので詰める
          sizeSmall: { paddingInline: 12 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          // 種別フィルタ等で横に並べるため、ボタン内で折り返させない（理由はMuiButtonと同じ）
          root: { whiteSpace: "nowrap" },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 16 },
        },
      },
    },
  });

// 既存コードとの互換のため、デフォルトはライトテーマを返す。
const theme = getTheme("light");

export default theme;
