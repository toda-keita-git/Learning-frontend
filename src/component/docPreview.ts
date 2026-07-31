// 旧形式のWord文書(.doc / Word 97-2003)の読み込み（閲覧専用）。
// .docxとは異なりOOXML(zip+XML)ではなくOLE2の複合ファイル形式のため、
// mammothでは扱えず、word-extractorを使う。バンドルサイズへの影響を
// 抑えるため動的importする。元の書式・画像・表などは保持されず、
// 文章だけを抽出して表示する。

function base64ToBuffer(base64: string): Buffer {
  const binary = atob(base64.replace(/\r?\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return Buffer.from(bytes);
}

/**
 * .docのbase64データから文章だけを抽出する
 */
export async function extractDocText(base64Content: string): Promise<string> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const buffer = base64ToBuffer(base64Content);
  const document = await extractor.extract(buffer);
  return document.getBody();
}
