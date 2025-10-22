import React, { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
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
    <Box
      component="form" // Enterキーで送信できるようにform要素を使用
      onSubmit={(e) => {
        e.preventDefault();
        handleSendClick();
      }}
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        borderTop: "1px solid #ddd",
        bgcolor: "#fff",
      }}
    >
      <IconButton color="primary" onClick={onSearchMenuClick} title="詳細検索">
        <TuneIcon />
      </IconButton>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="メッセージを入力..."
        size="small"
        sx={{ mr: 1 }}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <IconButton color="primary" type="submit">
        <SendIcon />
      </IconButton>
    </Box>
  );
};
