// メモトレイ展開時の高さ。AppBar・下部ナビ（ともに56px、smブレークポイント以上は
// AppBarが64px）を除いた残りの縦幅をちょうど半分にし、上半分にプランボード・下半分に
// メモトレイが同時に見えるようにする（両者が同時に見えていないと、メモをドラッグして
// プランへドロップできないため）。NoteTray自身の高さと、PlanDashboard側でボードの
// 下余白を揃えるのに使うため、両者から参照できる場所に置く
export const NOTE_TRAY_EXPANDED_HEIGHT = {
  xs: "calc((100dvh - 56px - 56px) / 2)",
  sm: "calc((100dvh - 64px - 56px) / 2)",
} as const;
