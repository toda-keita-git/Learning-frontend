/**
 * テキスト用 Base64 を安全にデコード
 */
export const decodeBase64Text = (base64String: string): string => {
  try {
    // 改行や空白を削除
    const cleaned = base64String.replace(/\s/g, "");
    // atob で ASCII 文字列に変換
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(cleaned), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    console.warn("Failed to decode text Base64, returning raw string", e);
    return base64String;
  }
};

/**
 * 画像用 Base64 → data URL
 */
export const getImageDataUrl = (base64: string, ext: string) => {
  const cleaned = base64.replace(/\s/g, "");
  return `data:image/${ext};base64,${cleaned}`;
};
