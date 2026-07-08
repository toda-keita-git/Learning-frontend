import React, { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import SendIcon from "@mui/icons-material/Send";
import TuneIcon from "@mui/icons-material/Tune"; // 詳細検索アイコン
import { MicButton } from "./MicButton"; // 音声入力ボタン

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
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <IconButton color="primary" onClick={onSearchMenuClick} title="詳細検索">
        <TuneIcon />
      </IconButton>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="タイトル名検索…（🎤で音声入力も可）"
        size="small"
        sx={{ mr: 0.5 }}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {/* 音声で検索ワードを入力（対応ブラウザでのみ表示） */}
      <MicButton
        onTranscript={(t) =>
          setInputValue((prev) => (prev ? prev + " " + t : t))
        }
      />
      <IconButton color="primary" type="submit">
        <SendIcon />
      </IconButton>
    </Box>
  );
};
