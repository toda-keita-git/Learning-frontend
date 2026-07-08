import React, { useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MicIcon from "@mui/icons-material/Mic";

// ブラウザの音声認識API（Chrome/Edge/一部Safariで利用可）。
// 非対応ブラウザでは undefined になり、ボタン自体を出さない。
const SpeechRecognitionClass:
  | (new () => any)
  | undefined =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    : undefined;

export const isSpeechSupported = !!SpeechRecognitionClass;

type Props = {
  // 認識した文字列を受け取る（呼び出し側で入力欄へ反映する）
  onTranscript: (text: string) => void;
  size?: "small" | "medium";
};

/**
 * マイクで話した内容を文字にして返すボタン。
 * スマホの移動中などに「声でサッとメモ／検索」できるようにする。
 */
export const MicButton: React.FC<Props> = ({ onTranscript, size = "medium" }) => {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  // 最新のコールバックを参照し続ける（recognitionインスタンスは使い回すため）
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  if (!isSpeechSupported) return null;

  const handleClick = () => {
    if (!recRef.current) {
      const rec = new (SpeechRecognitionClass as new () => any)();
      rec.lang = "ja-JP";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join("");
        if (transcript) cbRef.current(transcript);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
    }

    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      try {
        recRef.current.start();
        setListening(true);
      } catch {
        // すでに開始済みの場合の二重startは無視
      }
    }
  };

  return (
    <Tooltip title={listening ? "音声入力を停止" : "音声で入力"}>
      <IconButton
        color={listening ? "error" : "primary"}
        onClick={handleClick}
        size={size}
        aria-label={listening ? "音声入力を停止" : "音声で入力"}
        sx={
          listening
            ? {
                animation: "micpulse 1s ease-in-out infinite",
                "@keyframes micpulse": {
                  "0%,100%": { opacity: 1 },
                  "50%": { opacity: 0.35 },
                },
              }
            : undefined
        }
      >
        <MicIcon fontSize={size === "small" ? "small" : "medium"} />
      </IconButton>
    </Tooltip>
  );
};

export default MicButton;
