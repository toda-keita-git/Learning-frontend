import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
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
      },
      workbox: {
        // アプリの外枠（HTML/JS/CSS/画像）をキャッシュしてオフライン初期表示・高速化
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // メインバンドルが大きめなので、プリキャッシュ上限を引き上げる
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // API と GitHub へのアクセスはキャッシュせず、常にネットワークから取得
        navigateFallbackDenylist: [/^\/api/],
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
    allowedHosts: ["learning-frontend-x5jf.onrender.com"],
  },
  esbuild: {
    logOverride: { "unused-import": "silent" },
  },
});
