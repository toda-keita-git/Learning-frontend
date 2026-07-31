// 穴埋め記法: メモの中で [[隠したい語句]] と書くと、復習時にその部分だけを隠せる。
// 実際の穴埋め処理（解析・表示・タップでの表示切り替え）はMarkdownContent側で
// Markdown書式と統合して行う。ここでは「穴埋めを含むか」の判定のみ共通化する
export const hasCloze = (text: string) => /\[\[[\s\S]+?\]\]/.test(text);
