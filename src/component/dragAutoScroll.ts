// ドラッグ中に画面の端まで指を持っていくと、目的のプランが画面外にあっても
// 操作を止めずに自動でスクロールできるようにするヘルパー
const EDGE_PX = 72;
const MAX_SPEED = 18;

export function maybeAutoScrollWindow(clientY: number): void {
  const h = window.innerHeight;
  if (clientY < EDGE_PX) {
    const speed = ((EDGE_PX - clientY) / EDGE_PX) * MAX_SPEED;
    window.scrollBy(0, -speed);
  } else if (clientY > h - EDGE_PX) {
    const speed = ((clientY - (h - EDGE_PX)) / EDGE_PX) * MAX_SPEED;
    window.scrollBy(0, speed);
  }
}
