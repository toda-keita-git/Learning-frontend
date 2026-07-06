import React from "react";
import { styled } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// --- Styled Components ---

// メッセージ1行（左右で寄せ方向を切り替える flex 行）
const MessageRow = styled(Box)({
  display: "flex",
  marginBottom: "14px",
  alignItems: "flex-end",
  gap: "8px",
});

const MessageRowLeft = styled(MessageRow)({
  justifyContent: "flex-start",
});

const MessageRowRight = styled(MessageRow)({
  justifyContent: "flex-end",
});

// バブル共通：内容に合わせて伸縮し、長文は折り返す
const Bubble = styled("div")({
  position: "relative",
  padding: "10px 14px",
  maxWidth: "76%",
  width: "fit-content",
  borderRadius: "18px",
  lineHeight: 1.7,
  wordBreak: "break-word",
  boxShadow: "0 1px 2px rgba(31,41,55,0.08)",
});

// 相手（Bot / システム）：白ベースで左下だけ角を落とす
const BubbleLeft = styled(Bubble)({
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#1f2937",
  borderBottomLeftRadius: "6px",
});

// 自分：プライマリ（インディゴ）で白文字。右下だけ角を落とす
const BubbleRight = styled(Bubble)({
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  borderBottomRightRadius: "6px",
});

// --- Props ---

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

/** 相手のメッセージ（アバターが左） */
export const MessageLeft: React.FC<MessageLeftProps> = ({
  message = "no message",
  timestamp = "",
  photoURL = "",
  displayName = "名無しさん",
}) => {
  return (
    <MessageRowLeft>
      <Avatar
        src={photoURL}
        sx={{ width: 36, height: 36, bgcolor: "#c7d2fe", flexShrink: 0 }}
      />
      <Box sx={{ maxWidth: "80%" }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 0.5, ml: 0.5 }}
        >
          {displayName}
        </Typography>
        <BubbleLeft>
          <Typography
            variant="body2"
            component="div"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </BubbleLeft>
        {timestamp && (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", mt: 0.5, ml: 0.5 }}
          >
            {timestamp}
          </Typography>
        )}
      </Box>
    </MessageRowLeft>
  );
};

/** 自分のメッセージ（右寄せ） */
export const MessageRight: React.FC<MessageRightProps> = ({
  message = "no message",
  timestamp = "",
}) => {
  return (
    <MessageRowRight>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          maxWidth: "80%",
        }}
      >
        <BubbleRight>
          <Typography
            variant="body2"
            component="div"
            sx={{ "& a": { color: "#e0e7ff" } }}
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </BubbleRight>
        {timestamp && (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", mt: 0.5, mr: 0.5 }}
          >
            {timestamp}
          </Typography>
        )}
      </Box>
    </MessageRowRight>
  );
};
