import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MarkdownContent from "./MarkdownContent";
import { useFullScreenDialog } from "./useFullScreenDialog";

interface MarkdownHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

// 「書き方」と「実際の表示」を、MarkdownContent自身で描画して一致させる
// （説明用に別の実装を用意すると、挙動とズレていく恐れがあるため）
const EXAMPLES: { syntax: string; sample?: string }[] = [
  { syntax: "# 見出し1 / ## 見出し2", sample: "## 見出し2" },
  { syntax: "**太字**", sample: "**太字**" },
  { syntax: "*斜体*", sample: "*斜体*" },
  { syntax: "~~取り消し線~~", sample: "~~取り消し線~~" },
  { syntax: "==マーカー==", sample: "==マーカー==" },
  { syntax: "- 項目\n- 項目", sample: "- 項目1\n- 項目2" },
  { syntax: "1. 項目\n2. 項目", sample: "1. 項目1\n2. 項目2" },
  { syntax: "- [ ] 未完了\n- [x] 完了", sample: "- [ ] 未完了\n- [x] 完了" },
  { syntax: "> 引用文", sample: "> 引用文" },
  { syntax: "`コード`", sample: "`コード`" },
  { syntax: "[リンク](URL)", sample: "[リンク](https://example.com)" },
  {
    syntax: "| 見出し | 見出し |\n| --- | --- |\n| 値 | 値 |",
    sample: "| 見出し | 見出し |\n| --- | --- |\n| 値 | 値 |",
  },
];

const MarkdownHelpDialog: React.FC<MarkdownHelpDialogProps> = ({ open, onClose }) => {
  const fullScreenDialog = useFullScreenDialog();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreenDialog}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InfoOutlinedIcon color="primary" />
        内容・メモの書き方
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          「内容・メモ」ではMarkdown記法が使えます。書き方と実際の表示は次の通りです。
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            alignItems: "start",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
            書き方
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
            表示結果
          </Typography>
          {EXAMPLES.map(({ syntax, sample }) => (
            <React.Fragment key={syntax}>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  p: 0.75,
                }}
              >
                {syntax}
              </Box>
              <Box sx={{ pt: 0.5 }}>
                <MarkdownContent text={sample ?? syntax} color="text.primary" />
              </Box>
            </React.Fragment>
          ))}
        </Box>

        <Typography
          variant="caption"
          sx={{ display: "block", color: "text.secondary", mt: 2 }}
        >
          ※ 「[[ ]]」で囲むと、復習時にその部分だけ隠せます（例: useEffectは[[副作用]]を扱うためのフック）。
        </Typography>

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1,
            bgcolor: (theme) => theme.palette.action.hover,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            対応していないもの
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            HTMLタグ（&lt;div&gt;や色指定など）はセキュリティ対策のため解釈されず表示されません。
            文字色を自由に指定する記法（マーカー以外の色）、数式・絵文字ショートコード・脚注などの拡張記法にも対応していません。
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          とじる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MarkdownHelpDialog;
