// Word文書(.docx)の読み書き。バンドルサイズへの影響を抑えるため mammoth / docx は動的import する。
//
// 【重要な制約】
// 元の書式・画像・表などは保持されない。読み込み時に文章だけを抽出し、
// 保存時はその文章から新しいシンプルな.docxファイルを作り直す
// （既存の.docxを見た目そのまま編集する機能ではない）。

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

/**
 * プレーンテキストから新しい.docxファイルを作り、base64文字列で返す
 */
export async function createDocxFromText(text: string): Promise<string> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const doc = new Document({
    sections: [
      {
        children: text
          .split("\n")
          .map((line) => new Paragraph({ children: [new TextRun(line)] })),
      },
    ],
  });
  return Packer.toBase64String(doc);
}
