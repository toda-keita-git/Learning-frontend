/**
 * GitHub の Base64 を安全に処理
 */
export const decodeBase64 = (base64: string, extension: string): string => {
  // 画像やバイナリはデコードせずそのまま返す
  const imageExtensions = ["png","jpg","jpeg","gif","bmp","svg","ico","webp"];
  if (imageExtensions.includes(extension.toLowerCase())) return base64;

  try {
    // 改行・空白を削除して atob
    const cleaned = base64.replace(/\s/g, "");
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(cleaned), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    console.warn("テキストデコードに失敗。元の文字列を返します", e);
    return base64;
  }
};
