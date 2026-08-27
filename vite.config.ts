import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    // 旧形式Word(.doc)プレビュー（docPreview.ts）で使うword-extractorが、
    // 内部でNode組み込みのBuffer/streamに依存しているため、ブラウザ向けに
    // 必要最小限のポリフィルのみを当てる
    nodePolyfills({
      include: ["buffer", "stream"],
      globals: {
        Buffer: true,
        process: false,
        global: false,
      },
    }),
    // PDFプレビュー（pdfPreview.ts）で、埋め込まれていないCJKフォントを
    // 正しく描画するためにpdfjs-distのcmaps/standard_fontsが必要。
    // 通常のimportでは扱えないため、ビルド成果物に直接コピーする
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/pdfjs-dist/cmaps/*",
          dest: "cmaps",
          rename: { stripBase: true },
        },
        {
          src: "node_modules/pdfjs-dist/standard_fonts/*",
          dest: "standard_fonts",
          rename: { stripBase: true },
        },
      ],
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "学習ログ",
        short_name: "学習ログ",
        description:
          "学んだことをGitHub上のコードと結びつけて記録・振り返りできる学習記録アプリ",
        theme_color: "#4f46e5",
        background_color: "#f6f7fb",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "ja",
        icons: [
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
        // 他アプリ（ブラウザ等）の「共有」先に本アプリを表示し、
        // 共有された記事のタイトル・URLを学習記録の入力に引き渡す。
        // ※インストール済みPWAでのみ共有シートに出る。
        share_target: {
          action: "/LearningContent",
          method: "GET",
          enctype: "application/x-www-form-urlencoded",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
        // ホーム画面アイコンの長押しから、外出先でもすぐ使える主要機能に直行する
        shortcuts: [
          {
            name: "クイック記録",
            short_name: "記録",
            description: "新しい学習内容をすぐに記録する",
            url: "/LearningContent?quickadd=1",
            icons: [{ src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml" }],
          },
          {
            name: "今日の復習",
            short_name: "復習",
            description: "今日の復習をすぐに始める",
            url: "/LearningContent?review=1",
            icons: [{ src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml" }],
          },
        ],
      },
      workbox: {
        // アプリの外枠（HTML/JS/CSS/画像）をキャッシュしてオフライン初期表示・高速化
        globPatterns: ["**/*.{js,mjs,css,html,svg,png,ico,woff2}"],
        // メインバンドルが大きめなので、プリキャッシュ上限を引き上げる
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // API と GitHub へのアクセスはキャッシュせず、常にネットワークから取得
        navigateFallbackDenylist: [/^\/api/],
        // 復習リマインド通知のクリック処理（notificationclick）を生成されるSWに追加
        importScripts: ["notification-sw.js"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api") ||
              url.hostname.includes("github") ||
              url.hostname.includes("onrender.com"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // pdfjs-distのworkerは.mjsで出力されるが、Renderの静的ホスティングが
        // .mjs拡張子を静的ファイルとして認識せず、SPA用のフォールバックで
        // index.html（text/html）を返してしまい、モジュールワーカーの読み込みが
        // 失敗する（.jsは正しく配信されている）。出力時に.jsへ差し替えて回避する
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";
          if (name.endsWith(".mjs")) {
            return "assets/[name]-[hash].js";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  server: {
    // プロキシの設定を追加
    proxy: {
      // '/api' で始まるリクエストをすべてプロキシする
      "/api": {
        // 転送先サーバーのURL
        target: "https://learning-backend-1-wlzo.onrender.com",
        // オリジンを偽装してCORSエラーを回避
        changeOrigin: true,
        // パスから '/api' を削除する
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    // Renderのフロントエンドは過去にURLが変わっているため、現行・旧URLの両方を許可しておく
    // （どちらかに戻して確認したいときにブロックされないようにするため）
    allowedHosts: [
      "learning-frontend-1-vtyf.onrender.com",
      "learning-frontend-x5jf.onrender.com",
    ],
  },
  esbuild: {
    logOverride: { "unused-import": "silent" },
  },
});
