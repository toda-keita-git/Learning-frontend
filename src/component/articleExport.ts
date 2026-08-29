// 学習記録1件を、Zenn/Qiitaなどにそのまま貼れるMarkdown記事に変換する。

import { parseAttachments } from "./attachments";
import { parseReferenceUrls } from "./referenceUrls";

interface ArticleSourceItem {
  title: string;
  explanatory_text: string;
  understanding_level: number | null;
  category_name: string;
  tags: string[];
  reference_url: string | null;
  created_at: string;
  github_path: string;
}

export function buildArticleMarkdown(item: ArticleSourceItem): string {
  const stars =
    item.understanding_level == null
      ? "未設定"
      : "★".repeat(item.understanding_level) + "☆".repeat(5 - item.understanding_level);
  const tagsLine = item.tags.length > 0 ? item.tags.map((t) => `\`#${t}\``).join(" ") : "";
  const dateStr = (() => {
    const d = new Date(item.created_at);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
  })();

  let md = `# ${item.title}\n\n`;
  md += `> カテゴリ: ${item.category_name}${tagsLine ? " ｜ " + tagsLine : ""}\n`;
  md += `> 理解度: ${stars}${dateStr ? ` ｜ 記録日: ${dateStr}` : ""}\n\n`;
  md += `## 学んだこと\n\n${item.explanatory_text || "_(メモ未記入)_"}\n\n`;

  const referenceUrls = parseReferenceUrls(item.reference_url);
  if (referenceUrls.length > 0) {
    md += `## 参考リンク\n\n${referenceUrls.map((url) => `- ${url}`).join("\n")}\n\n`;
  }

  const attachments = parseAttachments(item.github_path, null);
  if (attachments.length > 0) {
    md += `## 関連コード\n\n${attachments.map((a) => `- \`${a.path}\``).join("\n")}\n\n`;
  }

  md += `---\n_この記事はツミアゲの記録から生成されました。_\n`;
  return md;
}

// GitHubに保存するファイルパス用の簡易スラッグ化
export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\w぀-ヿ㐀-鿿\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return slug || "article";
}
