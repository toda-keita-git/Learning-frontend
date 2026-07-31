import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root } from "mdast";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";

interface MarkdownContentProps {
  text: string;
  // カード概要など、色をまわりのTypographyに合わせたい箇所向け
  color?: string;
}

// ==テキスト== をマーカー（<mark>）でハイライト表示するための独自記法。
// 任意のCSS色を自由入力させるとスタイル崩れやCSS経由のトリッキーな挙動の
// 温床になりやすいため、色は選ばせずマーカー1色に固定している
function remarkHighlight() {
  return (tree: Root) => {
    findAndReplace(tree, [
      [
        /==([^=\n]+)==/g,
        (_match: string, value: string) =>
          ({
            type: "highlight",
            children: [{ type: "text", value }],
          }) as any,
      ],
    ]);
  };
}

// mdast-util-to-hastのHandlersの型は既知のノード種別しか受け付けないため、
// 独自ノード種別"highlight"を追加する都合上ここだけanyでキャストする
const remarkRehypeOptions = {
  handlers: {
    highlight(state: any, node: any) {
      return {
        type: "element",
        tagName: "mark",
        properties: {},
        children: state.all(node),
      };
    },
  },
} as any;

// 内容・メモをMarkdownとして表示する共通コンポーネント。
// remark-gfmで箇条書き・番号付きリスト・表（GFMテーブル）に対応する。
// HTMLタグの解釈（rehype-raw等）は意図的に組み込んでいない
// （メモは他人と共有され得るため、XSS対策として生HTMLは常にエスケープ表示にする）
const MarkdownContent: React.FC<MarkdownContentProps> = ({ text, color }) => {
  return (
    <Box
      sx={{
        color: color ?? "text.secondary",
        fontSize: "0.875rem",
        lineHeight: 1.7,
        wordBreak: "break-word",
        "& > *:first-of-type": { mt: 0 },
        "& > *:last-child": { mb: 0 },
        "& p": { m: 0, mb: 1 },
        "& ul, & ol": { m: 0, mb: 1, pl: 3 },
        "& li": { mb: 0.25 },
        "& table": {
          borderCollapse: "collapse",
          display: "block",
          overflowX: "auto",
          mb: 1,
          maxWidth: "100%",
        },
        "& th, & td": {
          border: "1px solid",
          borderColor: "divider",
          px: 1,
          py: 0.5,
          textAlign: "left",
        },
        "& th": { fontWeight: 700, bgcolor: "action.hover" },
        "& code": {
          fontFamily: "monospace",
          bgcolor: "action.hover",
          borderRadius: 0.5,
          px: 0.5,
          py: "1px",
          fontSize: "0.85em",
        },
        "& pre": {
          bgcolor: "action.hover",
          borderRadius: 1,
          p: 1,
          overflowX: "auto",
        },
        "& pre code": { bgcolor: "transparent", p: 0 },
        "& blockquote": {
          m: 0,
          mb: 1,
          pl: 1.5,
          borderLeft: "3px solid",
          borderColor: "divider",
          color: "text.secondary",
        },
        "& hr": { border: "none", borderTop: "1px solid", borderColor: "divider" },
        "& mark": {
          bgcolor: (theme) => theme.palette.warning.light,
          color: (theme) => theme.palette.getContrastText(theme.palette.warning.light),
          borderRadius: 0.5,
          px: 0.3,
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkHighlight]}
        remarkRehypeOptions={remarkRehypeOptions}
        components={{
          a: ({ ...props }) => (
            <Link {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownContent;
