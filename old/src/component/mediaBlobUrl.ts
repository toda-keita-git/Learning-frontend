// data:URIをそのまま<video src="...">に渡すと、ファイルサイズが大きい動画では
// 読み込みに失敗しやすい（ブラウザによってはdata URIの実効上限に近くなる上、
// base64化で元データより約33%大きくなる）。実データをBlobに変換して
// object URLを発行する方が、同じデータでも安定して再生できる。
export const dataUrlToBlobUrl = (
  dataUrl: string,
  fallbackMimeType = "application/octet-stream"
): string | null => {
  try {
    if (!dataUrl.startsWith("data:")) return null;
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) return null;
    const header = dataUrl.slice(5, commaIndex); // "data:" の後ろ〜","の手前
    const base64 = dataUrl.slice(commaIndex + 1);
    if (!base64) return null;

    const mimeMatch = header.match(/^([^;]+);base64$/);
    const mimeType = mimeMatch ? mimeMatch[1] : fallbackMimeType;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  } catch {
    return null;
  }
};
