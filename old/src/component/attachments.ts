// 学習記録に添付するGitHub上のファイルは、これまで1件（github_path/commit_shaの
// 単一カラム）だけを前提としていたが、複数件添付できるようにする。
// バックエンドのカラム型（どちらも文字列）は変えず、複数件をJSON配列として
// 同じカラムにエンコードする。既存データ（単なるパス文字列1件）は
// 後方互換的に1件の添付として扱う（読み込み時にcommit_shaカラムと組み合わせる）。

export type Attachment = {
  path: string;
  sha: string | null;
};

export function parseAttachments(
  githubPath: string | null | undefined,
  commitSha: string | null | undefined
): Attachment[] {
  const raw = (githubPath ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (p): p is { path: string; sha?: string | null } =>
            !!p && typeof p === "object" && typeof p.path === "string" && p.path.trim().length > 0
        )
        .map((p) => ({ path: p.path, sha: p.sha ?? null }));
    }
  } catch {
    // JSONとして解釈できない = 既存形式（単一パスの文字列）
  }

  return [{ path: raw, sha: (commitSha ?? "").trim() || null }];
}

export function serializeAttachments(attachments: Attachment[]): {
  github_path: string;
  commit_sha: string;
} {
  const cleaned = attachments.filter((a) => a.path.trim().length > 0);
  if (cleaned.length === 0) return { github_path: "", commit_sha: "" };
  return {
    github_path: JSON.stringify(cleaned.map((a) => ({ path: a.path, sha: a.sha ?? null }))),
    commit_sha: "",
  };
}
