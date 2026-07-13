// 学習記録1件を、Zenn/Qiitaなどにそのまま貼れるMarkdown記事に変換する。

interface ArticleSourceItem {
  title: string;
  explanatory_text: string;
  understanding_level: number;
  category_name: string;
  tags: string[];
  reference_url: string | null;
  created_at: string;
  github_path: string;
}

export function buildArticleMarkdown(item: ArticleSourceItem): string {
  const stars = "★".repeat(item.understanding_level) + "☆".repeat(5 - item.understanding_level);
  const tagsLine = item.tags.length > 0 ? item.tags.map((t) => `\`#${t}\``).join(" ") : "";
  const dateStr = (() => {
    const d = new Date(item.created_at);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
  })();

  let md = `# ${item.title}\n\n`;
  md += `> カテゴリ: ${item.category_name}${tagsLine ? " ｜ " + tagsLine : ""}\n`;
  md += `> 理解度: ${stars}${dateStr ? ` ｜ 記録日: ${dateStr}` : ""}\n\n`;
  md += `## 学んだこと\n\n${item.explanatory_text || "_(メモ未記入)_"}\n\n`;

  if (item.reference_url) {
    md += `## 参考リンク\n\n- ${item.reference_url}\n\n`;
  }

  if (item.github_path) {
    md += `## 関連コード\n\n\`${item.github_path}\`\n\n`;
  }

  md += `---\n_この記事は学習ログアプリの記録から生成されました。_\n`;
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
