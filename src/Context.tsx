import React, { useState, useRef, useEffect, createContext } from "react";
import type { ReactNode } from "react";
import { Octokit } from "@octokit/rest";

// .envからの変数読み込み
const client = import.meta.env.VITE_GITHUB_CLIENT_ID;
const callback = import.meta.env.VITE_CALLBACK_URL;
const token_url = import.meta.env.VITE_BACKEND_TOKEN_URL;

// Contextの型定義
interface AuthContextType {
  octokit: Octokit | null;
  isAuthenticated: boolean;
  login: () => void;
}

// Contextの作成
export const AuthContext = createContext<AuthContextType>({
  octokit: null,
  isAuthenticated: false,
  login: () => {},
});

// AuthProviderコンポーネント
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const effectRan = useRef(false); // 実行済みかを管理するフラグ

  const url = `https://github.com/login/oauth/authorize?client_id=${client}&scope=repo&redirect_uri=${callback}`;

  const login = () => {
    window.location.assign(url);
  };

  useEffect(() => {
    // 【修正点①】実行済みフラグをチェック。trueならここで処理を中断。
    if (effectRan.current) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && !octokit) {
      const exchangeCodeForToken = async (authCode: string) => {
        try {
          const response = await fetch(`${token_url}?code=${authCode}`);

          if (!response.ok) {
            throw new Error("バックエンドからのトークン取得に失敗しました。");
          }

          const data = await response.json();
          const token = data.token;

          if (!token) {
            throw new Error("レスポンスにトークンが含まれていません。");
          }

          setOctokit(new Octokit({ auth: token }));
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } catch (error) {
          console.error("トークンの取得に失敗しました:", error);
        }
      };

      exchangeCodeForToken(code);
      // 【修正点②】処理を実行したので、フラグをtrueにする
      effectRan.current = true;
    }
    // 【修正点③】依存配列は必ず空にする
  }, []);

  return (
    <AuthContext.Provider
      value={{ octokit, isAuthenticated: !!octokit, login }}
    >
      {children}
    </AuthContext.Provider>
  );
};
