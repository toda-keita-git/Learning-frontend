// 参考URLは、これまで1件（reference_urlの単一カラム）だけを前提としていたが、
// 複数件登録できるようにする。バックエンドのカラム型（文字列）は変えず、
// 複数件をJSON配列として同じカラムにエンコードする。既存データ（単なるURL
// 文字列1件）は後方互換的に1件として扱う。

export function parseReferenceUrls(referenceUrl: string | null | undefined): string[] {
  const raw = (referenceUrl ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    }
  } catch {
    // JSONとして解釈できない = 既存形式（単一URLの文字列）
  }

  return [raw];
}

export function serializeReferenceUrls(urls: string[]): string {
  const cleaned = urls.map((u) => u.trim()).filter((u) => u.length > 0);
  if (cleaned.length === 0) return "";
  return JSON.stringify(cleaned);
}
