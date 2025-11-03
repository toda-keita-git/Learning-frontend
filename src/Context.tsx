import React, { useState, useRef, useEffect, createContext } from "react";
import type { ReactNode } from "react";
import { Octokit } from "@octokit/rest";

const client = import.meta.env.VITE_GITHUB_CLIENT_ID;
const callback = import.meta.env.VITE_CALLBACK_URL;
const backendUrl = import.meta.env.VITE_BACKEND_TOKEN_URL; // e.g. https://learning-backend-1-wlzo.onrender.com

interface AuthContextType {
  octokit: Octokit | null;
  isAuthenticated: boolean;
  userId: number | null;
  githubLogin: string | null;
  repoName: string | null; 
  token: string | null;
  login: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  octokit: null,
  isAuthenticated: false,
  userId: null,
  githubLogin: null,
  repoName: null, 
  login: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const effectRan = useRef(false);
  const repoName = githubLogin ? `learning-site-${githubLogin}` : null;

  const login = () => {
    const url = `https://github.com/login/oauth/authorize?client_id=${client}&scope=repo&redirect_uri=${callback}`;
    window.location.assign(url);
  };

  useEffect(() => {
    if (effectRan.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && !octokit) {
      const exchangeCodeForToken = async (authCode: string) => {
        try {
          const response = await fetch(`${backendUrl}/github/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: authCode }),
          });

          if (!response.ok) throw new Error("バックエンドからのトークン取得に失敗しました。");

          const data = await response.json();
          const token = data.access_token;
          const id = data.user_id;
          const loginName = data.github_login;

          if (!token) throw new Error("レスポンスにトークンが含まれていません。");

          setOctokit(new Octokit({ auth: token }));
          setUserId(id);
          setGithubLogin(loginName);

          // URLからcodeを削除
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("トークンの取得に失敗しました:", err);
        }
      };

      exchangeCodeForToken(code);
      effectRan.current = true;
    }
  }, []);

  return (
    <AuthContext.Provider
  value={{
    octokit,
    isAuthenticated: !!octokit,
    githubLogin,
    repoName,  // ここでリポジトリ名を追加
    userId,
    token,
    login,
  }}
>
  {children}
</AuthContext.Provider>
  );
};
