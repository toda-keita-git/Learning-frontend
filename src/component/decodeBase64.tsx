/**
 * Base64を安全にデコード
 * - テキスト/JSONはデコードして返す
 * - 画像などはそのまま返す
 */
export const decodeBase64 = (base64String: string): string => {
  try {
    // data:image 形式ならそのまま返す
    if (base64String.startsWith("data:image")) return base64String;

    // 改行や空白を削除して atob に渡す
    const cleaned = base64String.replace(/\s/g, "");

    // デコード
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(cleaned), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return decoded;
  } catch (e) {
    console.warn("Base64のデコードに失敗しました。元の文字列を返します。", e);
    return base64String; // 失敗した場合は元のBase64を返す
  }
};
