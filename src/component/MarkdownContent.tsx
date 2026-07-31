import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root, Content } from "mdast";
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

// 段落の中身が指定した記号1つだけ（例: "[["）かどうかを判定する
const isMarkerParagraph = (node: any, marker: string): boolean =>
  node?.type === "paragraph" &&
  Array.isArray(node.children) &&
  node.children.length === 1 &&
  node.children[0].type === "text" &&
  node.children[0].value.trim() === marker;

// [[ ]]を穴埋め（クリックで表示する伏字）に変換する。
// 出現順にclozeIndexを振り、どのインスタンスがタップされたか区別できるようにする。
// - インライン: 文中の [[語句]] はその場で伏字になる（==強調==などのネストにも対応）
// - ブロック: 空行を挟んで [[ ]] だけの段落で表・リストなどを囲むと、
//   その一連のブロックごと1つの穴埋めとして隠せる
//     [[
//
//     | 見出し | 見出し |
//     | --- | --- |
//
//     ]]
function remarkCloze() {
  return (tree: Root) => {
    let clozeIndex = 0;

    const processChildren = (children: Content[]): Content[] => {
      const result: Content[] = [];
      let i = 0;
      while (i < children.length) {
        const node = children[i];
        if (isMarkerParagraph(node, "[[")) {
          let end = -1;
          for (let j = i + 1; j < children.length; j++) {
            if (isMarkerParagraph(children[j], "]]")) {
              end = j;
              break;
            }
          }
          if (end !== -1) {
            const inner = children.slice(i + 1, end);
            result.push({
              type: "clozeBlock",
              children: inner,
              clozeIndex: clozeIndex++,
            } as any);
            i = end + 1;
            continue;
          }
        }
        if (Array.isArray((node as any).children)) {
          (node as any).children = processChildren((node as any).children);
        }
        result.push(node);
        i += 1;
      }
      return result;
    };

    tree.children = processChildren(tree.children) as Root["children"];

    // ブロック単位で処理しきれなかった残り（1行で完結する [[語句]]）はインラインで処理する
    findAndReplace(tree, [
      [
        /\[\[(.+?)\]\]/g,
        (_match: string, value: string) => {
          const node = {
            type: "cloze",
            children: [{ type: "text", value }],
            clozeIndex,
          } as any;
          clozeIndex += 1;
          return node;
        },
      ],
    ]);
  };
}

// mdast-util-to-hastのHandlersの型は既知のノード種別しか受け付けないため、
// 独自ノード種別"highlight"/"cloze"/"clozeBlock"を追加する都合上ここだけanyでキャストする
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
    cloze(state: any, node: any) {
      return {
        type: "element",
        tagName: "cloze-blank",
        properties: { clozeIndex: node.clozeIndex },
        children: state.all(node),
      };
    },
    clozeBlock(state: any, node: any) {
      return {
        type: "element",
        tagName: "cloze-block",
        properties: { clozeIndex: node.clozeIndex },
        children: state.all(node),
      };
    },
  },
} as any;

// テキスト中の[[ ]]の総数（穴埋め箇所数、複数行にまたがるものも含む）を数える
const countCloze = (text: string) => (text.match(/\[\[[\s\S]+?\]\]/g) || []).length;

// hastノードから、伏字の長さの目安として使うテキストだけを取り出す
const hastText = (node: any): string => {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  if (Array.isArray(node.children)) return node.children.map(hastText).join("");
  return "";
};

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
        remarkPlugins={[remarkGfm, remarkCloze, remarkHighlight]}
        remarkRehypeOptions={remarkRehypeOptions}
        components={{
          a: ({ ...props }) => (
            <Link {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // @ts-expect-error 独自タグ名なのでReactMarkdownの型定義には無い
          "cloze-blank": ({ node, children }: any) => {
            const index = node?.properties?.clozeIndex as number;
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
                {revealed ? children : "█".repeat(Math.min(Math.max(hastText(node).length, 2), 10))}
              </Box>
            );
          },
          "cloze-block": ({ node, children }: any) => {
            const index = node?.properties?.clozeIndex as number;
            const revealed = forceRevealed || revealedIndexes.has(index);
            if (revealed) {
              return (
                <Box
                  sx={{
                    border: "1px dashed",
                    borderColor: "warning.main",
                    borderRadius: 1,
                    p: 1,
                    mb: 1,
                    bgcolor: (theme) => alphaFallback(theme, "warning.light"),
                  }}
                >
                  {children}
                </Box>
              );
            }
            return (
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  revealOne(index);
                }}
                sx={{
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  mb: 1,
                  textAlign: "center",
                  color: "text.secondary",
                  cursor: "pointer",
                }}
              >
                タップして表示
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

// theme.palette.warning.light に軽い透明度をかけた背景色（テーマのalpha関数への
// 依存を増やさないよう、mixで代用）
function alphaFallback(theme: any, path: string) {
  const [group, key] = path.split(".");
  const base = theme.palette[group][key] as string;
  return theme.palette.mode === "dark" ? `${base}33` : `${base}22`;
}

export default MarkdownContent;
