import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // プロキシの設定を追加
    proxy: {
      // '/api' で始まるリクエストをすべてプロキシする
      "/api": {
        // 転送先サーバーのURL
        target: "http://127.0.0.1:8080",
        // オリジンを偽装してCORSエラーを回避
        changeOrigin: true,
        // パスから '/api' を削除する
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
