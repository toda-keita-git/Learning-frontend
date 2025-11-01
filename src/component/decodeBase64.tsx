/**
 * 画像用 Base64 → data URL
 */
/**
 * 改行を除去してから画像の data URL を返す
 */
export const getImageDataUrl = (base64String: string, ext: string): string => {
  if (!base64String) return "";

  // 改行や空白を除去（GitHub APIは76文字ごとに改行を入れる）
  const cleaned = base64String.replace(/\r?\n/g, "").trim();

  // MIMEタイプを拡張子から決定
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
  };
  const mimeType = mimeMap[ext.toLowerCase()] || "application/octet-stream";

  // data URL 形式に変換して返す
  return `data:${mimeType};base64,${cleaned}`;
};

/**
 * テキストデータを安全にデコード
 */
export const decodeBase64Text = (base64String: string): string => {
  try {
    if (!base64String) return "";
    const cleaned = base64String.replace(/\r?\n/g, "").trim();
    return decodeURIComponent(
      Array.prototype.map
        .call(
          atob(cleaned),
          (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );
  } catch (e) {
    console.error("Base64テキストのデコードに失敗しました:", e);
    return "⚠️ コンテンツのデコードに失敗しました。";
  }
};

