// PDFプレビュー（閲覧専用）。バンドルサイズへの影響を抑えるため pdfjs-dist は動的import する。

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\r?\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * PDFのbase64データを各ページのPNG画像（data URL）の配列に変換する
 */
export async function renderPdfPagesToImages(
  base64Content: string
): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url"))
    .default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = base64ToUint8Array(base64Content);
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const pageImages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, viewport }).promise;
    pageImages.push(canvas.toDataURL("image/png"));
  }
  return pageImages;
}
