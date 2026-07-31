// 穴埋め記法: メモの中で [[隠したい語句]] と書くと、復習時にその部分だけを隠せる。
// ReviewFlashcards（実際の復習画面）と、NewLearningDialogのプレビュー
// （記録時に隠せているか確認する用途）の両方から使う共通ロジック
const CLOZE_PATTERN = /\[\[(.+?)\]\]/g;

export const hasCloze = (text: string) => /\[\[.+?\]\]/.test(text);

export type ClozeSegment = { text: string; hidden: boolean };

export const parseCloze = (text: string): ClozeSegment[] => {
  const segments: ClozeSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CLOZE_PATTERN.lastIndex = 0;
  while ((match = CLOZE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), hidden: false });
    }
    segments.push({ text: match[1], hidden: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), hidden: false });
  }
  return segments;
};

// [[語句]] の記号だけを取り除き、中の語句をそのまま残す（全て表示し終えた後、
// 通常のメモ表示＝Markdown描画に切り替えるために使う）
export const stripCloze = (text: string): string =>
  text.replace(CLOZE_PATTERN, "$1");
