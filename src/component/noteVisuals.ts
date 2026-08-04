import type { Note } from "./PlanTypes";

// メモ種別ごとの色をアプリ全体（メモカード・メモトレイなど）で統一する
export const NOTE_TYPE_COLOR: Record<Note["type"], "warning" | "success" | "default"> = {
  learning: "warning",
  task: "success",
  normal: "default",
};

export const NOTE_TYPE_BORDER_COLOR: Record<Note["type"], string> = {
  learning: "warning.main",
  task: "success.main",
  normal: "divider",
};
