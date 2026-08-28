import React, { useState, useRef, useEffect, createContext } from "react";
import type { ReactNode } from "react";
import { Octokit } from "@octokit/rest";
import { setAppToken, googleRefreshApi, linkGoogleApi, linkGithubApi, meApi, githubTokenApi } from "./component/Api";
import { useToast } from "./ToastContext";
import { errorMessage } from "./component/errorMessage";
import {
  savePersistedSession,
  loadPersistedSession,
  clearPersistedSession,
  updatePersistedRepoName,
} from "./component/authStorage";

const client = import.meta.env.VITE_GITHUB_CLIENT_ID;
const callback = import.meta.env.VITE_CALLBACK_URL;
const backendUrl = import.meta.env.VITE_BACKEND_TOKEN_URL; // e.g. https://learning-backend-1-wlzo.onrender.com

const googleClient = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const googleCallback = import.meta.env.VITE_GOOGLE_CALLBACK_URL;
const GOOGLE_CALLBACK_PATH = "/google/callback";
// 「今回のOAuthはログインではなくアカウント連携だ」という目印。
// リダイレクトを挟むため、その間だけ意図を持ち越す必要がある
const LINK_INTENT_KEY = "oauthLinkIntent";
// drive.fileはこのアプリが作成したファイルにのみアクセスできる限定スコープ。
// access_type=offline + prompt=consent で毎回refresh_tokenを強制取得する
// （Driveのアクセストークンは約1時間で失効するため、GitHubと違い再取得が必須）
const GOOGLE_SCOPE = "openid email profile https://www.googleapis.com/auth/drive.file";

type AuthProviderKind = "github" | "google" | null;

interface AuthContextType {
  octokit: Octokit | null;
  isAuthenticated: boolean;
  userId: number | null;
  githubLogin: string | null;
  repoName: string | null;
  // 使用するリポジトリを既存のものに切り替える（バックエンドへの保存とContextの更新を両方行う）
  setRepoName: (repoName: string) => void;
  token: string | null;
  login: () => void;
  logout: () => void;
  isAuthenticating: boolean;

  // --- Googleドライブ連携用（GitHub連携と並存） ---
  authProvider: AuthProviderKind;
  googleEmail: string | null;
  driveFolderId: string | null;
  // 添付操作の直前に呼び、有効なDriveアクセストークンを保証する（失効間近なら自動で再取得する）。
  // 取得できない場合（オフライン等）はnullを返すので、呼び出し側でエラー表示すること
  ensureDriveAccessToken: () => Promise<string | null>;
  loginWithGoogle: () => void;

  // --- アカウント連携（1つのアカウントにGitHubとGoogleの両方を持たせる） ---
  linkGithub: () => void;
  linkGoogle: () => void;
  // どちらのアカウントを連携済みか。ログインに使ったプロバイダーに関わらず、
  // 添付の保存先として使えるかどうかの判断に使う
  hasGithub: boolean;
  hasGoogle: boolean;
  // 連携直後など、サーバー側の状態を取り直したいときに呼ぶ
  refreshAccountInfo: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  octokit: null,
  isAuthenticated: false,
  userId: null,
  githubLogin: null,
  repoName: null,
  setRepoName: () => {},
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticating: false,
  authProvider: null,
  googleEmail: null,
  driveFolderId: null,
  ensureDriveAccessToken: async () => null,
  loginWithGoogle: () => {},
  linkGithub: () => {},
  linkGoogle: () => {},
  hasGithub: false,
  hasGoogle: false,
  refreshAccountInfo: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [repoNameState, setRepoNameState] = useState<string | null>(null);
  const [token, _setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // --- Googleドライブ連携用のstate ---
  const [authProvider, setAuthProvider] = useState<AuthProviderKind>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [driveAccessTokenExpiresAt, setDriveAccessTokenExpiresAt] = useState<number | null>(null);
  // 連携状況。ログインに使ったプロバイダーだけでは「もう一方も連携済みか」が
  // 分からないため、サーバー(/me)から取得して保持する
  const [hasGithub, setHasGithub] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  const effectRan = useRef(false);
  // refreshAccountInfoは初回のuseEffect内から呼ばれ、その時点のoctokit stateは
  // まだ更新前なので、判定用に最新値をrefでも持っておく
  const octokitRef = useRef<Octokit | null>(null);
  // repo_nameカラムが無かった頃に保存されたセッションなど、値がまだ無い場合の保険
  const repoName = repoNameState ?? (githubLogin ? `learning-site-${githubLogin}` : null);

  const githubAuthorizeUrl = () =>
    `https://github.com/login/oauth/authorize?client_id=${client}&scope=repo&redirect_uri=${callback}`;

  const googleAuthorizeUrl = () =>
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClient}` +
    `&redirect_uri=${encodeURIComponent(googleCallback)}` +
    `&response_type=code&access_type=offline&prompt=consent` +
    `&scope=${encodeURIComponent(GOOGLE_SCOPE)}`;

  const login = () => {
    sessionStorage.removeItem(LINK_INTENT_KEY);
    window.location.assign(githubAuthorizeUrl());
  };

  const loginWithGoogle = () => {
    sessionStorage.removeItem(LINK_INTENT_KEY);
    window.location.assign(googleAuthorizeUrl());
  };

  // --- アカウント連携 ---
  // OAuthのリダイレクト先はログインと同じURLを使い回す（Google Cloud Console／GitHub OAuth Appに
  // 別のコールバックURLを追加登録しなくて済むようにするため）。
  // 「これはログインではなく連携だ」という区別はsessionStorageの目印で行う。
  // localStorageではなくsessionStorageなのは、途中で離脱した目印が
  // いつまでも残って次回のログインを誤って連携扱いしないようにするため
  const linkGithub = () => {
    sessionStorage.setItem(LINK_INTENT_KEY, "github");
    window.location.assign(githubAuthorizeUrl());
  };

  const linkGoogle = () => {
    sessionStorage.setItem(LINK_INTENT_KEY, "google");
    window.location.assign(googleAuthorizeUrl());
  };

  const logout = () => {
    clearPersistedSession();
    setAppToken(null);
    octokitRef.current = null;
    setOctokit(null);
    setUserId(null);
    setGithubLogin(null);
    setRepoNameState(null);
    _setToken(null);
    setAuthProvider(null);
    setGoogleEmail(null);
    setDriveFolderId(null);
    setDriveAccessToken(null);
    setDriveAccessTokenExpiresAt(null);
  };

  // 使用するリポジトリを既存のものに切り替える。バックエンドへの保存は呼び出し元
  // （selectRepoApi）が行い、ここではContextとlocalStorageの更新のみを担う
  const setRepoName = (newRepoName: string) => {
    setRepoNameState(newRepoName);
    updatePersistedRepoName(newRepoName);
  };

  // サーバー(/me)から連携状況を取り直す。
  // 「GitHubでログインしているが、Googleも連携済み」といった状態は
  // ログイン応答だけでは分からない（GitHubのログイン応答にdrive_folder_idは無い）ため、
  // ここで取得しないと連携済みのDriveが添付先として使えないままになる
  const refreshAccountInfo = async (): Promise<void> => {
    try {
      const info = await meApi();
      setHasGithub(info.has_github);
      setHasGoogle(info.has_google);
      if (info.drive_folder_id) setDriveFolderId(info.drive_folder_id);
      if (info.repo_name) setRepoNameState((prev) => prev ?? info.repo_name);
      if (info.github_login) setGithubLogin((prev) => prev ?? info.github_login);

      // GitHubへの添付はブラウザ側のOctokitが行うため、GitHubのアクセストークンが要る。
      // Googleでログインして後からGitHubを連携した場合はログイン応答で受け取る機会が
      // 無いので、サーバーが保持している分をここで受け取ってOctokitを組み立てる
      if (info.has_github && !octokitRef.current) {
        try {
          const { access_token } = await githubTokenApi();
          const githubClient = new Octokit({ auth: access_token });
          octokitRef.current = githubClient;
          setOctokit(githubClient);
          _setToken(access_token);
        } catch (err) {
          console.error("GitHubアクセストークンの取得に失敗しました:", err);
        }
      }
    } catch (err) {
      // 取得できなくてもアプリ自体は使えるようにする（オフライン等）
      console.error("アカウント情報の取得に失敗しました:", err);
    }
  };

  // Driveのアクセストークンは短命なので、呼ばれるたびに残り有効期限を見て
  // 必要なら自動で再取得してから返す
  const ensureDriveAccessToken = async (): Promise<string | null> => {
    const now = Date.now();
    if (driveAccessToken && driveAccessTokenExpiresAt && driveAccessTokenExpiresAt - now > 60_000) {
      return driveAccessToken;
    }
    try {
      const { access_token, expires_in } = await googleRefreshApi();
      setDriveAccessToken(access_token);
      setDriveAccessTokenExpiresAt(Date.now() + expires_in * 1000);
      return access_token;
    } catch (err) {
      console.error("Driveアクセストークンの再取得に失敗しました:", err);
      return null;
    }
  };

  useEffect(() => {
    if (effectRan.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const onGoogleCallback = window.location.pathname === GOOGLE_CALLBACK_PATH;

    // アカウント連携から戻ってきた場合。ログイン処理（新規ユーザー作成を伴う）ではなく、
    // ログイン中のユーザー行にもう一方のアカウントを書き足すAPIを呼ぶ
    const linkIntent = sessionStorage.getItem(LINK_INTENT_KEY);
    if (code && linkIntent) {
      sessionStorage.removeItem(LINK_INTENT_KEY);
      const runLink = async (authCode: string) => {
        setIsAuthenticating(true);
        try {
          // 連携APIは本人確認が必須。保存済みセッションのapp_tokenを先に復元しておく
          const saved = loadPersistedSession();
          if (!saved) throw new Error("ログイン情報が見つかりません。もう一度ログインしてください。");
          setAppToken(saved.appToken);

          if (linkIntent === "google") {
            const data = await linkGoogleApi(authCode);
            setDriveFolderId(data.drive_folder_id ?? null);
            if (data.access_token) {
              setDriveAccessToken(data.access_token);
              setDriveAccessTokenExpiresAt(Date.now() + (data.expires_in ?? 3600) * 1000);
            }
            savePersistedSession({ ...saved, driveFolderId: data.drive_folder_id ?? saved.driveFolderId });
          } else {
            const data = await linkGithubApi(authCode);
            savePersistedSession({ ...saved, repoName: data.repo_name ?? saved.repoName });
          }
          // 連携直後は保存先の選択肢が増えるので、状態を取り直してから画面へ戻す
          await refreshAccountInfo();
          showToast("アカウントを連携しました。", "success");
        } catch (err) {
          console.error("アカウント連携に失敗しました:", err);
          showToast(errorMessage(err, "アカウント連携に失敗しました。"), "error", { durationMs: 10000 });
        } finally {
          setIsAuthenticating(false);
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.assign("/LearningContent");
        }
      };

      runLink(code);
      effectRan.current = true;
      return;
    }

    if (code && onGoogleCallback) {
      const exchangeGoogleCodeForToken = async (authCode: string) => {
        setIsAuthenticating(true);
        try {
          const response = await fetch(`${backendUrl}/google/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: authCode }),
          });

          if (!response.ok) {
            // DevToolsが無い環境（スマホ等）でも原因が分かるよう、ステータスと
            // バックエンドが返した本文をそのままエラーメッセージに含める
            const bodyText = await response.text().catch(() => "");
            throw new Error(`バックエンドからのトークン取得に失敗しました。(status: ${response.status}) ${bodyText}`.trim());
          }

          const data = await response.json();
          const driveToken = data.access_token; // Drive API呼び出し用（短命）
          const expiresIn: number = data.expires_in ?? 3600;
          const appToken = data.app_token;
          const id = data.user_id;
          const email: string | null = data.email ?? null;
          const folderId: string | null = data.drive_folder_id ?? null;

          if (!driveToken) throw new Error("レスポンスにトークンが含まれていません。");
          if (!appToken) throw new Error("レスポンスに認証トークンが含まれていません。");

          setAuthProvider("google");
          setGoogleEmail(email);
          setUserId(id);
          setDriveFolderId(folderId);
          setDriveAccessToken(driveToken);
          setDriveAccessTokenExpiresAt(Date.now() + expiresIn * 1000);
          setAppToken(appToken);

          // オフラインで開き直したときもすぐアプリを開けるよう、ログイン情報を保存しておく。
          // Driveの短命トークン・refresh_tokenは保存しない（refresh_tokenはサーバー側のみが保持）
          savePersistedSession({
            accessToken: "",
            appToken,
            userId: id,
            githubLogin: email ?? "",
            repoName: null,
            authProvider: "google",
            driveFolderId: folderId,
          });

          window.history.replaceState({}, document.title, window.location.pathname);
          // /google/callback から通常のアプリ画面へ（保存済みセッションから復元される）
          window.location.assign("/LearningContent");
        } catch (err) {
          console.error("Googleトークンの取得に失敗しました:", err);
          showToast(err instanceof Error ? err.message : "Googleログインに失敗しました。", "error", { durationMs: 10000 });
        } finally {
          setIsAuthenticating(false);
        }
      };

      exchangeGoogleCodeForToken(code);
      effectRan.current = true;
      return;
    }

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
          const repoNameFromServer: string | null = data.repo_name ?? null;

          if (!token) throw new Error("レスポンスにトークンが含まれていません。");
          if (!appToken) throw new Error("レスポンスに認証トークンが含まれていません。");

          octokitRef.current = new Octokit({ auth: token });
          setOctokit(octokitRef.current);
          setUserId(id);
          setGithubLogin(loginName);
          setRepoNameState(repoNameFromServer);
          setAuthProvider("github");
          _setToken(token); // ← トークンをContextに保存（フォルダ選択等の認証に必要）
          setAppToken(appToken); // ← 以降の自バックエンドへのAPIリクエストに自動で付与される

          // オフラインで開き直したときもすぐアプリを開けるよう、ログイン情報を保存しておく
          savePersistedSession({
            accessToken: token,
            appToken,
            userId: id,
            githubLogin: loginName,
            repoName: repoNameFromServer,
            authProvider: "github",
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
      setUserId(saved.userId);
      setAppToken(saved.appToken);
      // どちらを連携済みかはローカルの保存内容だけでは分からないため、サーバーに聞く。
      // これをしないと「GitHubでログイン中だがGoogleも連携済み」の場合に
      // Driveが添付先として選べないままになる
      refreshAccountInfo();

      if (saved.authProvider === "google") {
        setAuthProvider("google");
        setGoogleEmail(saved.githubLogin || null);
        setDriveFolderId(saved.driveFolderId ?? null);
        // Driveの短命トークンは保存していないため、都度再取得する
        // （オフラインなら失敗するが、Drive関連機能以外はそのまま使える）
        googleRefreshApi()
          .then(({ access_token, expires_in }) => {
            setDriveAccessToken(access_token);
            setDriveAccessTokenExpiresAt(Date.now() + expires_in * 1000);
          })
          .catch((err) => {
            console.error("Driveアクセストークンの再取得に失敗しました:", err);
          });
      } else {
        octokitRef.current = new Octokit({ auth: saved.accessToken });
        setOctokit(octokitRef.current);
        setGithubLogin(saved.githubLogin);
        setRepoNameState(saved.repoName ?? null);
        setAuthProvider("github");
        _setToken(saved.accessToken);
      }
    }
    effectRan.current = true;
  }, []);

  const isAuthenticated = authProvider === "google" ? !!userId : !!octokit;

  return (
    <AuthContext.Provider
  value={{
    octokit,
    isAuthenticated,
    githubLogin,
    repoName,  // ここでリポジトリ名を追加
    setRepoName,
    userId,
    token,
    login,
    logout,
    isAuthenticating,
    authProvider,
    googleEmail,
    driveFolderId,
    ensureDriveAccessToken,
    loginWithGoogle,
    linkGithub,
    linkGoogle,
    hasGithub,
    hasGoogle,
    refreshAccountInfo,
  }}
>
  {children}
</AuthContext.Provider>
  );
};
