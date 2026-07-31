import React, { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import TuneIcon from "@mui/icons-material/Tune"; // 詳細検索アイコン

// --- TextInput Component ---

type TextInputProps = {
  onSendMessage: (message: string) => void;
  onSearchMenuClick: () => void;
};

/**
 * メッセージ入力と送信ボタンのコンポーネント
 */
export const TextInputLearning: React.FC<TextInputProps> = ({
  onSendMessage,
  onSearchMenuClick,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleSendClick = () => {
    onSendMessage(inputValue);
    setInputValue("");
  };

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Box
        component="form" // Enterキーで送信できるようにform要素を使用
        onSubmit={(e) => {
          e.preventDefault();
          handleSendClick();
        }}
        sx={{
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* スマホでは下部ナビの「検索」から同じ詳細検索を開けるため、ここでは重複を避けて非表示にする */}
        <IconButton
          color="primary"
          onClick={onSearchMenuClick}
          title="詳細検索（カテゴリ・タグでの絞り込み、並び替え）"
          sx={{ display: { xs: "none", sm: "inline-flex" } }}
        >
          <TuneIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="キーワードで検索…"
          size="small"
          sx={{ mr: 0.5 }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <IconButton color="primary" type="submit">
          <SendIcon />
        </IconButton>
      </Box>
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 0.5, ml: 0.5, color: "text.secondary" }}
      >
        タイトル・内容・タグなどをまとめて検索します。カテゴリ・タグでの絞り込みや並び替えは「詳細検索」から。
      </Typography>
    </Box>
  );
};
