import React from "react";
import { styled } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// --- Styled Components Definition ---

// メッセージ行のベーススタイル
const MessageRow = styled(Box)({
  display: "flex",
  marginBottom: "10px",
});

// 他人のメッセージ行（左寄せ）
const MessageRowLeft = styled(MessageRow)({
  justifyContent: "flex-start",
});

// 自分のメッセージ行（右寄せ）
const MessageRowRight = styled(MessageRow)({
  justifyContent: "flex-end",
});

// メッセージ内容のテキストスタイル
const MessageContent = styled(Typography)({
  padding: 0,
  margin: 0,
  font: "400 .9em 'Open Sans', sans-serif", // 元のスタイルを維持
});

// メッセージバブルの共通スタイル
const MessageBubbleBase = styled("div")({
  position: "relative",
  padding: "10px",
  width: "60%",
  borderRadius: "10px",
});

// 他人のメッセージバブル（青色）
const MessageBlue = styled(MessageBubbleBase)(({}) => ({
  marginLeft: "20px",
  backgroundColor: "#A8DDFD",
  border: "1px solid #97C6E3",
  "&:after": {
    content: "''",
    position: "absolute",
    width: 0,
    height: 0,
    borderTop: "15px solid #A8DDFD",
    borderLeft: "15px solid transparent",
    borderRight: "15px solid transparent",
    top: 0,
    left: "-15px",
  },
  "&:before": {
    content: "''",
    position: "absolute",
    width: 0,
    height: 0,
    borderTop: "17px solid #97C6E3",
    borderLeft: "16px solid transparent",
    borderRight: "16px solid transparent",
    top: "-1px",
    left: "-17px",
  },
}));

// 自分のメッセージバブル（オレンジ色）
const MessageOrange = styled(MessageBubbleBase)(({}) => ({
  marginRight: "20px",
  width: "100%",
  backgroundColor: "#f8e896",
  border: "1px solid #dfd087",
  "&:after": {
    content: "''",
    position: "absolute",
    width: 0,
    height: 0,
    borderTop: "15px solid #f8e896",
    borderLeft: "15px solid transparent",
    borderRight: "15px solid transparent",
    top: 0,
    right: "-15px",
  },
  "&:before": {
    content: "''",
    position: "absolute",
    width: 0,
    height: 0,
    borderTop: "17px solid #dfd087",
    borderLeft: "16px solid transparent",
    borderRight: "16px solid transparent",
    top: "-1px",
    right: "-17px",
  },
}));

// --- Component Props Definition ---

interface MessageLeftProps {
  message?: string;
  timestamp?: string;
  photoURL?: string;
  displayName?: string;
}

interface MessageRightProps {
  message?: string;
  timestamp?: string;
}

// --- Components ---

/**
 * 他人のメッセージ（アバターが左）
 */
export const MessageLeft: React.FC<MessageLeftProps> = ({
  message = "no message",
  timestamp = "",
  photoURL = "",
  displayName = "名無しさん",
}) => {
  return (
    <MessageRowLeft>
      {/* ★ 修正箇所：全体をBoxで囲むのをやめ、MessageLeftの構成に合わせる */}
      <Avatar src={photoURL} sx={{ width: 40, height: 40, mr: 2 }} />
      <Box>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            textAlign: "left",
          }}
        >
          {displayName}
        </Typography>
        <MessageBlue>
          <Typography
            variant="body1"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </MessageBlue>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            textAlign: "left",
            display: "block",
            marginLeft: "20px",
          }}
        >
          {timestamp}
        </Typography>
      </Box>
    </MessageRowLeft>
  );
};

/**
 * 自分のメッセージ（右寄せ）
 */
export const MessageRight: React.FC<MessageRightProps> = ({
  message = "no message",
  timestamp = "",
}) => {
  return (
    <MessageRowRight>
      {/* ★ 修正箇所：Boxで囲み、タイムスタンプをメッセージの下に配置 */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <MessageOrange>
          {/* ★ 修正箇所：MessageLeftの dangerouslySetInnerHTML との整合性を考慮し、
                         こちらもTypographyでラップ。必要に応じてdangerouslySetInnerHTMLを使用可能にする */}
          <Typography
            variant="body1"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </MessageOrange>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            textAlign: "right", // 右寄せのため right に変更
            display: "block",
            marginRight: "20px", // 右端に合わせるため marginRight に変更
          }}
        >
          {timestamp}
        </Typography>
      </Box>
    </MessageRowRight>
  );
};
