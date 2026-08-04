// Word文書(.docx)の読み込み（閲覧専用）。バンドルサイズへの影響を抑えるため mammoth は動的import する。
// 元の書式・画像・表などは保持されず、文章だけを抽出して表示する。

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64.replace(/\r?\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * .docxのbase64データから文章だけを抽出する
 */
export async function extractDocxText(base64Content: string): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const arrayBuffer = base64ToArrayBuffer(base64Content);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
