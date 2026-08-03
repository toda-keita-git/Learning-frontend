// ログイン状態(GitHubアクセストークン・アプリのJWT等)をlocalStorageへ保存する。
//
// 【重要な前提】これまでこのアプリは、ログイン情報をメモリ(React state)にしか
// 持たず、リロードのたびにGitHub OAuthをやり直す設計だった。だが、これでは
// オフライン中に開き直すとログイン画面から進めず、オフライン閲覧が
// 実質使えなかった。localStorageに保存することで、オフラインでもすぐ
// アプリ本体（＝キャッシュされた学習データ）を開けるようにする。
//
// トレードオフ: トークンを永続化する分、万一XSS等でスクリプトが実行された
// 場合に読み取られる被害範囲は、メモリのみ保持していた場合より広がる。

const STORAGE_KEY = "learningAuthSession";

export type PersistedSession = {
  accessToken: string; // GitHub API呼び出し用（Octokit）
  appToken: string; // このアプリのバックエンドAPI呼び出し用（本人確認）
  userId: number;
  githubLogin: string;
  // 学習記録の添付先として使うリポジトリ名。このカラムが無かった頃に保存された
  // セッションにはまだ含まれないため、任意項目として扱う
  repoName?: string | null;
};

export const savePersistedSession = (session: PersistedSession) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 容量超過等は無視（オフライン起動ができなくなるだけで致命的ではない）
  }
};

export const loadPersistedSession = (): PersistedSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.accessToken !== "string" ||
      typeof parsed?.appToken !== "string" ||
      typeof parsed?.userId !== "number" ||
      typeof parsed?.githubLogin !== "string"
    ) {
      return null;
    }
    return parsed as PersistedSession;
  } catch {
    return null;
  }
};

export const clearPersistedSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
};

// repoNameだけを更新する。appToken等の他フィールドを保持したまま書き換えたいので、
// savePersistedSessionで丸ごと上書きするのではなく既存の保存内容を読んでから更新する
export const updatePersistedRepoName = (repoName: string) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.repoName = repoName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // noop
  }
};
