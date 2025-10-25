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
        target: "https://learning-backend-1-wlzo.onrender.com",
        // オリジンを偽装してCORSエラーを回避
        changeOrigin: true,
        // パスから '/api' を削除する
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
   preview: {
    host: '0.0.0.0',
    allowedHosts: ['learning-frontend-x5jf.onrender.com']
  },
  esbuild: {
    logOverride: { 'unused-import': 'silent' }
  }
});
