// メモ本文の```コードブロックだけを色付きで描画する。
//
// react-syntax-highlighterとPrismのテーマはそれなりに大きく、MarkdownContentが
// 直接importするとメモを1件でも表示する画面すべてに乗ってしまう。コードを貼った
// メモは全体からすれば一部なので、このファイルに切り出してlazyで読み込み、
// 実際にコードブロックが現れたときだけ取得する。
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@mui/material/styles";

interface MarkdownCodeBlockProps {
  language: string;
  code: string;
}

export default function MarkdownCodeBlock({ language, code }: MarkdownCodeBlockProps) {
  // 配色は画面の明るさ設定に合わせる（ダーク時に白背景が浮かないようにするため）
  const theme = useTheme();
  const style = theme.palette.mode === "dark" ? vscDarkPlus : oneLight;

  return (
    <SyntaxHighlighter
      language={language}
      style={style}
      customStyle={{ margin: 0, borderRadius: 4, fontSize: "0.85em" }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
