/**
 * Base64を安全にデコードするヘルパー関数
 * - テキスト/JSONをデコードして返す
 * - 画像などの場合はそのままBase64データURLを返す
 */
export const decodeBase64 = (base64String: string): string => {
  try {
    // データURL形式（例: "data:image/png;base64,..."）なら、そのまま返す
    if (base64String.startsWith("data:image")) {
      return base64String;
    }

    // 通常のBase64データをデコード
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(
          atob(base64String),
          (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );

    return decoded;
  } catch (e) {
    console.error("Failed to decode base64 string", e);
    return "コンテンツのデコードに失敗しました。";
  }
};
