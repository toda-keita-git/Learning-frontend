import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import ReplayIcon from "@mui/icons-material/Replay";

export type FlashItem = {
  id: number;
  title: string;
  explanatory_text: string;
  understanding_level: number;
  category_name: string;
  tags: string[];
  reference_url: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  items: FlashItem[];
  // 「わかった/まだ」に応じて理解度を更新する
  onRate: (item: FlashItem, newLevel: number) => Promise<void>;
}

const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

// スキマ時間の目安（1枚あたり約40秒で見積もり）
const TIME_PRESETS = [
  { label: "3分で", minutes: 3, count: 3 },
  { label: "10分で", minutes: 10, count: 8 },
  { label: "じっくり", minutes: null, count: Infinity },
] as const;

export default function ReviewFlashcards({ open, onClose, items, onRate }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  // スキマ時間モード: 何件やるかをまだ選んでいなければnull（選択画面を出す）
  const [sessionSize, setSessionSize] = useState<number | null>(null);

  // 開くたびに最初のカードから
  useEffect(() => {
    if (open) {
      setIndex(0);
      setRevealed(false);
      setDragX(0);
      setSessionSize(null);
    }
  }, [open]);

  const sessionItems =
    sessionSize === null ? [] : items.slice(0, sessionSize);
  const total = sessionItems.length;
  const current = sessionItems[index];
  const done = index >= total;

  const goNext = () => {
    setRevealed(false);
    setDragX(0);
    setIndex((i) => i + 1);
  };

  const rate = async (understood: boolean) => {
    if (!current || busy) return;
    const level = current.understanding_level ?? 3;
    const newLevel = understood
      ? Math.min(5, level + 1)
      : Math.max(1, level - 1);
    setBusy(true);
    try {
      // 理解度が変わるときだけ保存（同じなら通信しない）
      if (newLevel !== level) {
        await onRate(current, newLevel);
      }
    } catch {
      // 失敗しても復習フロー自体は止めない
    } finally {
      setBusy(false);
      goNext();
    }
  };

  // --- スワイプ（右=わかった / 左=まだ） ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (!revealed) return;
    startX.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDragX(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const dx = dragX;
    startX.current = null;
    if (dx > 90) rate(true);
    else if (dx < -90) rate(false);
    else setDragX(0);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}
      >
        <MenuBookOutlinedIcon color="primary" /> 今日の復習
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
          aria-label="閉じる"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 340 }}>
        {items.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <SentimentSatisfiedAltIcon
              sx={{ fontSize: 48, color: "success.main", mb: 1 }}
            />
            <Typography>復習が必要な記録はありません。よくできています！</Typography>
          </Box>
        ) : sessionSize === null ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ mb: 0.5, fontWeight: 700 }}>
              今、どれくらい時間がありますか？
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", mb: 3, display: "block" }}>
              スキマ時間に合わせて件数を調整します（理解度が低いものから優先）
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 260, mx: "auto" }}>
              {TIME_PRESETS.map((preset) => {
                const count = Math.min(preset.count, items.length);
                return (
                  <Button
                    key={preset.label}
                    variant="outlined"
                    onClick={() => setSessionSize(count)}
                    sx={{ justifyContent: "space-between" }}
                    endIcon={
                      <Chip
                        component="span"
                        size="small"
                        label={`${count}件`}
                        sx={{ ml: 1 }}
                      />
                    }
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
        ) : done ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <SentimentSatisfiedAltIcon
              sx={{ fontSize: 48, color: "success.main", mb: 1 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              お疲れさまでした！
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 1 }}>
              {total}件を振り返りました。
            </Typography>
          </Box>
        ) : (
          <>
            {/* 進捗 */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {index + 1} / {total}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  現在の理解度: {stars(current.understanding_level ?? 3)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(index / total) * 100}
              />
            </Box>

            {/* カード */}
            <Box
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 3,
                p: 3,
                minHeight: 200,
                display: "flex",
                flexDirection: "column",
                cursor: revealed ? "grab" : "pointer",
                touchAction: "pan-y",
                transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
                transition: startX.current === null ? "transform 0.2s ease" : "none",
                bgcolor:
                  dragX > 40
                    ? "rgba(16,185,129,0.10)"
                    : dragX < -40
                    ? "rgba(239,68,68,0.10)"
                    : "background.paper",
              }}
              onClick={() => !revealed && setRevealed(true)}
            >
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}>
                <Chip label={current.category_name} size="small" color="primary" variant="outlined" />
                {current.tags.map((t) => (
                  <Chip key={t} label={`#${t}`} size="small" />
                ))}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {current.title}
              </Typography>

              {revealed ? (
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
                >
                  {current.explanatory_text || "（メモはありません）"}
                </Typography>
              ) : (
                <Box sx={{ mt: "auto", textAlign: "center", color: "text.secondary" }}>
                  <Typography variant="body2">
                    内容を思い出せますか？
                  </Typography>
                  <Typography variant="caption">
                    タップでメモ（答え）を表示
                  </Typography>
                </Box>
              )}
            </Box>

            <Typography
              variant="caption"
              sx={{ display: "block", textAlign: "center", color: "text.secondary", mt: 1 }}
            >
              メモ表示後、「わかった／まだ」で理解度が更新されます（左右スワイプも可）
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {done || total === 0 ? (
          <>
            {total > 0 && (
              <Button
                startIcon={<ReplayIcon />}
                onClick={() => {
                  setIndex(0);
                  setRevealed(false);
                }}
              >
                もう一度
              </Button>
            )}
            <Button variant="contained" onClick={onClose}>
              とじる
            </Button>
          </>
        ) : (
          <>
            <Button
              fullWidth
              color="warning"
              variant="outlined"
              disabled={busy}
              onClick={() => (revealed ? rate(false) : setRevealed(true))}
            >
              {revealed ? "まだ（復習）" : "メモを見る"}
            </Button>
            <Button
              fullWidth
              color="success"
              variant="contained"
              disabled={busy || !revealed}
              onClick={() => rate(true)}
            >
              わかった
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
