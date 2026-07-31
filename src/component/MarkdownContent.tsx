import React, { useEffect, useRef, useState } from "react";
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
  // falseの場合、[[語句]]は伏字から始まり、1つずつタップして表示できる。
  // 省略時（true）は常に表示する（通常のメモ表示・記録一覧など向け）
  forceRevealed?: boolean;
  // [[ ]]で隠した箇所を全てタップし終えたときに呼ばれる（復習画面などで利用）
  onAllRevealed?: () => void;
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

// [[語句]] を穴埋め（クリックで表示する伏字）ノードに変換する。
// 出現順にclozeIndexを振り、どのインスタンスがタップされたか区別できるようにする
function remarkCloze() {
  return (tree: Root) => {
    let clozeIndex = 0;
    findAndReplace(tree, [
      [
        /\[\[(.+?)\]\]/g,
        (_match: string, value: string) => {
          const node = { type: "cloze", value, clozeIndex } as any;
          clozeIndex += 1;
          return node;
        },
      ],
    ]);
  };
}

// mdast-util-to-hastのHandlersの型は既知のノード種別しか受け付けないため、
// 独自ノード種別"highlight"/"cloze"を追加する都合上ここだけanyでキャストする
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
    cloze(_state: any, node: any) {
      return {
        type: "element",
        tagName: "cloze-blank",
        properties: { clozeIndex: node.clozeIndex, clozeText: node.value },
        children: [],
      };
    },
  },
} as any;

// テキスト中の[[ ]]の総数（穴埋め箇所数）を数える。表示状態の判定に使う
const countCloze = (text: string) => (text.match(/\[\[.+?\]\]/g) || []).length;

// 内容・メモをMarkdownとして表示する共通コンポーネント。
// remark-gfmで箇条書き・番号付きリスト・表（GFMテーブル）に対応する。
// HTMLタグの解釈（rehype-raw等）は意図的に組み込んでいない
// （メモは他人と共有され得るため、XSS対策として生HTMLは常にエスケープ表示にする）
const MarkdownContent: React.FC<MarkdownContentProps> = ({
  text,
  color,
  forceRevealed = true,
  onAllRevealed,
}) => {
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const notifiedRef = useRef(false);
  const totalCloze = countCloze(text);

  // メモの内容が変わったら（次のカードに進んだ、編集し直した等）タップ状況をリセットする
  useEffect(() => {
    setRevealedIndexes(new Set());
    notifiedRef.current = false;
  }, [text]);

  const allRevealed = forceRevealed || (totalCloze > 0 && revealedIndexes.size >= totalCloze);

  useEffect(() => {
    if (allRevealed && totalCloze > 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      onAllRevealed?.();
    }
    if (!allRevealed) {
      notifiedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed]);

  const revealOne = (index: number) => {
    setRevealedIndexes((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

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
        remarkPlugins={[remarkGfm, remarkHighlight, remarkCloze]}
        remarkRehypeOptions={remarkRehypeOptions}
        components={{
          a: ({ ...props }) => (
            <Link {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // @ts-expect-error 独自タグ名なのでReactMarkdownの型定義には無い
          "cloze-blank": ({ node }: any) => {
            const index = node?.properties?.clozeIndex as number;
            const value = (node?.properties?.clozeText as string) ?? "";
            const revealed = forceRevealed || revealedIndexes.has(index);
            return (
              <Box
                component="span"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!revealed) revealOne(index);
                }}
                sx={{
                  display: "inline-block",
                  cursor: revealed ? "default" : "pointer",
                  bgcolor: revealed ? "warning.light" : "action.selected",
                  color: revealed
                    ? (theme: any) => theme.palette.getContrastText(theme.palette.warning.light)
                    : "transparent",
                  borderRadius: 0.5,
                  px: 0.5,
                  mx: 0.25,
                }}
              >
                {revealed ? value : "█".repeat(Math.min(Math.max(value.length, 2), 10))}
              </Box>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownContent;
