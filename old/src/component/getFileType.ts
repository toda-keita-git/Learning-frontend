// getFileType.ts

export const getFileType = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase();

  // ファイル名自体で判定した方が良いもの (Dockerfileなど)
  const filename = path.split("/").pop()?.toLowerCase();
  if (filename === "dockerfile") return "docker";
  if (filename === "makefile" || filename === "gnumakefile") return "makefile";
  if (filename === "cmakelists.txt") return "cmake";
  if (filename === "nginx.conf") return "nginx";
  if (filename === ".editorconfig") return "editorconfig";
  if (filename === ".gitignore" || filename === ".dockerignore" || filename === ".npmignore")
    return "git";

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

    // --- 動画 ---
    case "mp4":
    case "webm":
    case "mov":
    case "m4v":
    case "avi":
    case "mkv":
    case "ogv":
      return "video";

    // --- PDF ---
    case "pdf":
      return "pdf";

    // --- Office文書とその他バイナリ ---
    case "xlsx":
    case "xls":
    case "csv":
      return "excel";
    case "docx":
      return "docx";
    case "doc":
      return "doc";
    case "pptx":
      return "pptx";
    case "zip":
      return "zip-archive";
    // 旧形式(.ppt)はOOXML(zip+XML)ではないため、対応ライブラリでは扱えない
    case "ppt":
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

    // --- 以下、追加のプログラミング言語・設定ファイル形式 ---
    case "scala":
    case "sc":
      return "scala";
    case "groovy":
    case "gradle":
      return "groovy";
    case "hs":
    case "lhs":
      return "haskell";
    case "clj":
    case "cljs":
    case "cljc":
      return "clojure";
    case "elm":
      return "elm";
    case "erl":
    case "hrl":
      return "erlang";
    case "fs":
    case "fsx":
      return "fsharp";
    case "vb":
    case "vbs":
      return "vbnet";
    case "cmake":
      return "cmake";
    case "conf":
    case "cfg":
      return "ini";
    case "tf":
    case "tfvars":
    case "hcl":
      return "hcl";
    case "proto":
      return "protobuf";
    case "sol":
      return "solidity";
    case "zig":
      return "zig";
    case "nim":
      return "nim";
    case "cr":
      return "crystal";
    case "hx":
      return "haxe";
    case "coffee":
      return "coffeescript";
    case "hbs":
    case "handlebars":
      return "handlebars";
    case "twig":
      return "twig";
    case "jinja":
    case "jinja2":
      return "django";
    case "diff":
    case "patch":
      return "diff";
    case "log":
      return "log";
    case "asm":
    case "s":
      return "nasm";
    case "awk":
      return "awk";
    case "as":
      return "actionscript";
    case "au3":
      return "autoit";
    case "tex":
    case "latex":
      return "latex";
    case "nix":
      return "nix";
    case "ml":
    case "mli":
      return "ocaml";
    case "purs":
      return "purescript";
    case "re":
      return "reason";
    case "sml":
      return "sml";
    case "pro":
      return "prolog";
    case "matlab":
      return "matlab";
    case "v":
    case "vh":
      return "verilog";
    case "vhd":
    case "vhdl":
      return "vhdl";
    case "editorconfig":
      return "editorconfig";
    case "npmrc":
    case "yarnrc":
      return "ini";
    case "json5":
      return "json5";
    case "jsonp":
      return "jsonp";
    case "txt":
      return "plaintext";

    default:
      return "plaintext";
  }
};

// MIMEタイプを取得するヘルパー関数
export const getMimeType = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    ogv: "video/ogg",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    js: "application/javascript",
    ts: "application/typescript",
    html: "text/html",
    css: "text/css",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  return mimeTypes[ext ?? ""] || "application/octet-stream";
};
