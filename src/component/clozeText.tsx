import React, { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { parseCloze, stripCloze } from "./clozeUtils";
import MarkdownContent from "./MarkdownContent";

interface ClozeTextProps {
  text: string;
  // trueの間は、個別のタップ状況に関わらず全て表示した状態にする
  // （カード全体のタップ／「メモを見る」ボタンなど、一括表示の入口用）
  forceRevealed?: boolean;
  // 穴埋め箇所をすべて（個別タップ、またはforceRevealedで）表示し終えたときに呼ばれる
  onAllRevealed?: () => void;
}

// 穴埋め部分を含むメモの表示。
// 隠された語句は1つずつタップして表示でき、すべて表示し終えると
// 通常のメモ表示（MarkdownContent）と同じ見た目に切り替わる
export const ClozeText: React.FC<ClozeTextProps> = ({
  text,
  forceRevealed = false,
  onAllRevealed,
}) => {
  const segments = useMemo(() => parseCloze(text), [text]);
  const hiddenIndexes = useMemo(
    () => segments.reduce<number[]>((acc, seg, i) => (seg.hidden ? [...acc, i] : acc), []),
    [segments]
  );
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const notifiedRef = React.useRef(false);

  const revealOne = (i: number) => {
    setRevealedIndexes((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  };

  const allRevealedByTap =
    hiddenIndexes.length > 0 && hiddenIndexes.every((i) => revealedIndexes.has(i));
  const allRevealed = forceRevealed || allRevealedByTap;

  React.useEffect(() => {
    if (allRevealed && !notifiedRef.current) {
      notifiedRef.current = true;
      onAllRevealed?.();
    }
    if (!allRevealed) {
      notifiedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed]);

  if (allRevealed) {
    // 全て表示したら、通常のメモ表示（Markdown）と同じ見た目にする
    return <MarkdownContent text={stripCloze(text)} color="text.primary" />;
  }

  return (
    <Typography
      variant="body2"
      sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
    >
      {segments.map((seg, i) =>
        seg.hidden ? (
          <Box
            key={i}
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              revealOne(i);
            }}
            sx={{
              display: "inline-block",
              cursor: revealedIndexes.has(i) ? "default" : "pointer",
              bgcolor: revealedIndexes.has(i) ? "warning.light" : "action.selected",
              color: revealedIndexes.has(i) ? "text.primary" : "transparent",
              borderRadius: 0.5,
              px: 0.5,
              mx: 0.25,
            }}
          >
            {revealedIndexes.has(i)
              ? seg.text
              : "█".repeat(Math.min(Math.max(seg.text.length, 2), 10))}
          </Box>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </Typography>
  );
};
