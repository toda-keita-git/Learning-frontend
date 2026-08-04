import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { PptxSlide } from "./pptxPreview";

interface PptxSlideViewProps {
  slide: PptxSlide;
}

// スライド1枚を、元のXML上の位置・サイズ(EMU→%変換済み)を保ったまま、
// テキストボックスと画像を絶対配置で再現する。フォントの見た目・図形の装飾・
// アニメーションなどは再現しない（軽量な代替プレビュー）
const PptxSlideView: React.FC<PptxSlideViewProps> = ({ slide }) => {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 480,
        aspectRatio: `${slide.slideWidth} / ${slide.slideHeight}`,
        bgcolor: "#fff",
        border: "1px solid #ddd",
        borderRadius: 1,
        boxShadow: 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {slide.elements.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          （内容なし）
        </Typography>
      ) : (
        slide.elements.map((el, i) => {
          const posStyle = {
            position: "absolute" as const,
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.width}%`,
            height: `${el.height}%`,
          };
          if (el.type === "image") {
            return (
              <Box
                key={i}
                component="img"
                src={el.src}
                alt=""
                sx={{ ...posStyle, objectFit: "contain" }}
              />
            );
          }
          return (
            <Box
              key={i}
              sx={{
                ...posStyle,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                p: "1.5%",
              }}
            >
              {el.lines.map((line, j) => (
                <Typography
                  key={j}
                  sx={{
                    fontSize: el.isTitle ? "1.1em" : "0.7em",
                    fontWeight: el.isTitle ? 700 : 400,
                    color: "#000",
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {line}
                </Typography>
              ))}
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default PptxSlideView;
