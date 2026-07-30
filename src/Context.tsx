import React, { useState, useRef, useEffect, createContext } from "react";
import type { ReactNode } from "react";
import { Octokit } from "@octokit/rest";
import { setAppToken } from "./component/Api";
import {
  savePersistedSession,
  loadPersistedSession,
  clearPersistedSession,
} from "./component/authStorage";

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
  logout: () => void;
  isAuthenticating: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  octokit: null,
  isAuthenticated: false,
  userId: null,
  githubLogin: null,
  repoName: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticating: false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [token, _setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const effectRan = useRef(false);
  const repoName = githubLogin ? `learning-site-${githubLogin}` : null;

  const login = () => {
    const url = `https://github.com/login/oauth/authorize?client_id=${client}&scope=repo&redirect_uri=${callback}`;
    window.location.assign(url);
  };

  const logout = () => {
    clearPersistedSession();
    setAppToken(null);
    setOctokit(null);
    setUserId(null);
    setGithubLogin(null);
    _setToken(null);
  };

  useEffect(() => {
    if (effectRan.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && !octokit) {
      const exchangeCodeForToken = async (authCode: string) => {
        setIsAuthenticating(true);
        try {
          const response = await fetch(`${backendUrl}/github/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: authCode }),
          });

          if (!response.ok) throw new Error("バックエンドからのトークン取得に失敗しました。");

          const data = await response.json();
          const token = data.access_token; // GitHub API呼び出し用（Octokit）
          const appToken = data.app_token; // このアプリのバックエンドAPI呼び出し用（本人確認）
          const id = data.user_id;
          const loginName = data.github_login;

          if (!token) throw new Error("レスポンスにトークンが含まれていません。");
          if (!appToken) throw new Error("レスポンスに認証トークンが含まれていません。");

          setOctokit(new Octokit({ auth: token }));
          setUserId(id);
          setGithubLogin(loginName);
          _setToken(token); // ← トークンをContextに保存（フォルダ選択等の認証に必要）
          setAppToken(appToken); // ← 以降の自バックエンドへのAPIリクエストに自動で付与される

          // オフラインで開き直したときもすぐアプリを開けるよう、ログイン情報を保存しておく
          savePersistedSession({
            accessToken: token,
            appToken,
            userId: id,
            githubLogin: loginName,
          });

          // URLからcodeを削除
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("トークンの取得に失敗しました:", err);
        } finally {
          setIsAuthenticating(false);
        }
      };

      exchangeCodeForToken(code);
      effectRan.current = true;
      return;
    }

    // codeが無ければ、保存済みのログイン情報があれば復元する。
    // 通信を伴わないため、オフラインで開いた場合でもここまでは辿り着ける
    const saved = loadPersistedSession();
    if (saved) {
      setOctokit(new Octokit({ auth: saved.accessToken }));
      setUserId(saved.userId);
      setGithubLogin(saved.githubLogin);
      _setToken(saved.accessToken);
      setAppToken(saved.appToken);
    }
    effectRan.current = true;
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
    logout,
    isAuthenticating,
  }}
>
  {children}
</AuthContext.Provider>
  );
};
