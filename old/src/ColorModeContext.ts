import { createContext } from "react";
import type { PaletteMode } from "@mui/material";

// ライト/ダークの現在値と、切り替え関数を全体に配るためのContext。
export const ColorModeContext = createContext<{
  mode: PaletteMode;
  toggle: () => void;
}>({
  mode: "light",
  toggle: () => {},
});
