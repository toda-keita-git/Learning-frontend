import React, { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import TuneIcon from "@mui/icons-material/Tune"; // 詳細検索アイコン
import BoltIcon from "@mui/icons-material/Bolt"; // クイック登録アイコン

// --- TextInput Component ---

type TextInputProps = {
  onSendMessage: (message: string) => void;
  onSearchMenuClick: () => void;
  // 詳細検索（カテゴリ・タグ絞り込み）自体を提供しない画面（ゲストモードなど）では、
  // 押しても何も起きないボタンを置かないようアイコンごと非表示にする
  hideDetailedSearch?: boolean;
  // 入力した文字列をタイトルとして、ダイアログを開かずその場で最小限の記録を作る
  // （省略時はクイック登録ボタン自体を出さない。上限到達時などは例外を投げてもらう
  // ことで、入力内容を復元できるようにしている）
  onQuickAdd?: (title: string) => void | Promise<void>;
};

/**
 * メッセージ入力と送信ボタンのコンポーネント
 */
export const TextInputLearning: React.FC<TextInputProps> = ({
  onSendMessage,
  onSearchMenuClick,
  hideDetailedSearch = false,
  onQuickAdd,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  const handleSendClick = () => {
    onSendMessage(inputValue);
    setInputValue("");
  };

  const handleQuickAddClick = async () => {
    if (!inputValue.trim() || quickAdding) return;
    const title = inputValue;
    setInputValue("");
    setQuickAdding(true);
    try {
      await onQuickAdd?.(title);
    } catch {
      // 上限到達などで失敗した場合、入力内容を消さずに戻す
      // （失敗理由のトーストは呼び出し側で表示済み）
      setInputValue(title);
    } finally {
      setQuickAdding(false);
    }
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
        {!hideDetailedSearch && (
          <IconButton
            color="primary"
            onClick={onSearchMenuClick}
            title="詳細検索（カテゴリ・タグでの絞り込み、並び替え）"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            <TuneIcon />
          </IconButton>
        )}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="キーワードで検索…"
          size="small"
          sx={{ mr: 0.5 }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {onQuickAdd && (
          <Tooltip title="この文字列をタイトルにして、今すぐ記録する">
            <span>
              <IconButton
                color="primary"
                onClick={handleQuickAddClick}
                disabled={!inputValue.trim() || quickAdding}
              >
                <BoltIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <IconButton color="primary" type="submit">
          <SendIcon />
        </IconButton>
      </Box>
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 0.5, ml: 0.5, color: "text.secondary" }}
      >
        {hideDetailedSearch
          ? "タイトル・内容・タグなどをまとめて検索します。"
          : "タイトル・内容・タグなどをまとめて検索します。カテゴリ・タグでの絞り込みや並び替えは「詳細検索」から。"}
        {onQuickAdd && "「⚡」でタイトルだけすぐ記録できます。"}
      </Typography>
    </Box>
  );
};
