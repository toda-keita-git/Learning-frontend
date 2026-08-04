// ドラッグ操作の意味を、アプリ全体で同じ色に統一するための定数（プラン一覧・メモトレイ共通）。
// 「この色を見たらこの操作」というルールを1つに絞ることで、画面ごとに考え直さなくて済むようにする
export const DRAG_COLOR = {
  // メモをプランへリンクする
  link: "success.main",
  // プランを別プランの子（アクションプラン）にする
  nest: "primary.main",
  // 兄弟内での並べ替え
  reorder: "warning.main",
  // ルート（独立した目標）に戻す
  promote: "text.secondary",
  // メモから新しいプランを作成する
  create: "secondary.main",
} as const;

export type DragHintKind = "link" | "nest" | "reorder" | "promote" | "create" | null;

export const DRAG_HINT_TEXT: Record<Exclude<DragHintKind, null>, string> = {
  link: "ここにリンク",
  nest: "この中に入れる",
  reorder: "ここに並べる",
  promote: "ルート（独立した目標）にする",
  create: "ここで新しい目標を作成",
};
