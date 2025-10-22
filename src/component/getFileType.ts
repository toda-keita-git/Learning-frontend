// getFileType.ts

export const getFileType = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase();

  // ファイル名自体で判定した方が良いもの (Dockerfileなど)
  const filename = path.split("/").pop()?.toLowerCase();
  if (filename === "dockerfile") return "docker";

  switch (extension) {
    // --- 画像 ---
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "bmp":
    case "webp":
    case "svg":
    case "ico":
      return "image";

    // --- PDF ---
    case "pdf":
      return "pdf";

    // --- Office文書とその他バイナリ ---
    case "xlsx":
    case "xls":
    case "csv":
      return "excel";
    case "xls":
    case "doc":
    case "docx":
    case "ppt":
    case "pptx":
    case "zip":
    case "gz":
    case "tar":
    case "rar":
    case "exe":
    case "dll":
      return "binary";

    // --- 以下はテキストベースのファイル (シンタックスハイライト用) ---
    case "js":
    case "cjs":
    case "mjs":
      return "javascript";
    case "jsx":
      return "jsx";
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "html":
    case "htm":
      return "html";
    case "css":
      return "css";
    case "scss":
    case "sass":
      return "scss";
    case "less":
      return "less";
    case "vue":
      return "vue";
    case "svelte":
      return "svelte";
    case "py":
    case "pyw":
      return "python";
    case "java":
    case "jar":
      return "java";
    case "php":
      return "php";
    case "go":
      return "go";
    case "rb":
      return "ruby";
    case "cs":
    case "csx":
      return "csharp";
    case "rs":
      return "rust";
    case "kt":
    case "kts":
      return "kotlin";
    case "swift":
      return "swift";
    case "pl":
    case "pm":
      return "perl";
    case "ex":
    case "exs":
      return "elixir";
    case "c":
    case "h":
      return "c";
    case "cpp":
    case "hpp":
    case "cc":
      return "cpp";
    case "m":
      return "objectivec";
    case "json":
      return "json";
    case "xml":
      return "xml";
    case "yml":
    case "yaml":
      return "yaml";
    case "md":
    case "markdown":
      return "markdown";
    case "sql":
      return "sql";
    case "graphql":
    case "gql":
      return "graphql";
    case "toml":
      return "toml";
    case "csv":
      return "csv";
    case "sh":
    case "bash":
    case "zsh":
      return "bash";
    case "ps1":
      return "powershell";
    case "bat":
    case "cmd":
      return "batch";
    case "lua":
      return "lua";
    case "ini":
      return "ini";
    case "env":
      return "properties";
    case "gitignore":
    case "gitattributes":
    case "gitmodules":
      return "git";
    case "r":
      return "r";
    case "dart":
      return "dart";
    case "jl":
      return "julia";

    default:
      return "plaintext";
  }
};

// MIMEタイプを取得するヘルパー関数
export const getMimeType = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "ico":
      return "image/x-icon";
    case "pdf":
      return "application/pdf";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
};
