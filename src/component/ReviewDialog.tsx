import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import MarkdownContent from "./MarkdownContent";
import { useFullScreenDialog } from "./useFullScreenDialog";
import type { Note } from "./PlanTypes";

// 本文に [[ ]] が含まれているか。含まれていれば穴埋めとして出題できる
export const hasCloze = (body: string | null): boolean => !!body && /\[\[[^\]]+\]\]/.test(body);

interface ReviewDialogProps {
  note: Note | null;
  onClose: () => void;
  // 「覚えていた」「あやふや」の自己申告に応じて、次に出す間隔を伸縮させる。
  // 呼び出し側でreview_interval_daysを更新する
  onGrade: (note: Note, remembered: boolean) => void;
}

// 習慣リストから開く復習画面。
//
// メモ本文の [[ ]] を伏字にして出題し、タップで1つずつ答え合わせできる。
// 記法と伏字の仕組み自体はMarkdownContentに元から実装されていたが、
// forceRevealedにfalseを渡す画面が無く使われていなかったため、ここで繋いでいる。
//
// 「記録したメモが、そのまま復習問題になる」のがこのアプリの狙いなので、
// 復習用に別途カードを作らせるようなことはしない。
export default function ReviewDialog({ note, onClose, onGrade }: ReviewDialogProps) {
  const fullScreenDialog = useFullScreenDialog();
  // 伏字をすべて開き終えたか。開き切るまでは自己採点ボタンを出さない
  // （答えを見る前に「覚えていた」を押せてしまうと復習にならないため）
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => {
    setAllRevealed(false);
  }, [note?.id]);

  if (!note) return null;

  const withCloze = hasCloze(note.body);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PsychologyOutlinedIcon color="primary" />
        復習
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {note.title}
            </Typography>
            {note.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.75, rowGap: 0.5 }}>
                {note.tags.map((tag) => (
                  <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
                ))}
              </Stack>
            )}
          </Box>

          {withCloze && !allRevealed && (
            <Alert severity="info">
              隠れている部分をタップすると答えが表示されます。まず思い出してから開いてみましょう。
            </Alert>
          )}

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
            {note.body?.trim() ? (
              <MarkdownContent
                text={note.body}
                // 穴埋めがあるメモだけ伏字で出す。無いメモは普通に読ませる
                forceRevealed={!withCloze}
                onAllRevealed={() => setAllRevealed(true)}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                本文がありません。
              </Typography>
            )}
          </Box>

          {!withCloze && (
            <Typography variant="caption" color="text.secondary">
              本文で覚えたい語句を [[ ]] で囲むと、次回からその部分が伏字になって出題されます。
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>とじる</Button>
        {/* 穴埋めがあるメモは開き切ってから、無いメモは読んだ時点で自己採点できる */}
        <Button
          onClick={() => onGrade(note, false)}
          color="warning"
          variant="outlined"
          disabled={withCloze && !allRevealed}
        >
          あやふや
        </Button>
        <Button
          onClick={() => onGrade(note, true)}
          color="success"
          variant="contained"
          disabled={withCloze && !allRevealed}
        >
          覚えていた
        </Button>
      </DialogActions>
    </Dialog>
  );
}
