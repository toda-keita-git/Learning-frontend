// 学習記録をユーザー自身のGitHubリポジトリへコミットして、
// コントリビューショングラフ（いわゆる「草」）を生やす。
//
// 添付ファイルの保存で既にこのリポジトリへコミットしているので、仕組みとしては
// その延長線上にある。狙いは「続けたことが自分のプロフィールに残る」ことで、
// アプリを開かない日でも記録した実感が可視化されるようにするため。
//
// 日付ごとに1ファイルへ追記していく形にしている（1日に何度記録しても
// コミットは同じファイルの更新になるため、リポジトリが荒れない）。
import { Octokit } from "@octokit/rest";

const LOG_DIR = "study-log";

// 端末のローカル日付。UTCで切ると日本時間の夜の記録が前日扱いになってしまう
const localDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const encodeBase64 = (text: string): string => {
  // btoaはLatin-1しか扱えないため、日本語を含む本文はUTF-8バイト列へ変換してから渡す
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

const decodeBase64 = (base64: string): string => {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export interface StudyLogEntry {
  // 記録した内容の見出し（メモのタイトルなど）
  title: string;
  // 「メモを作成」「復習した」など、何をしたか
  action: string;
}

/**
 * 今日の学習ログへ1行追記する。
 *
 * 失敗しても本来の操作（メモの保存など）は成立しているため、呼び出し側は
 * この結果でユーザーの操作を失敗扱いにしないこと。
 */
export const appendStudyLog = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  entry: StudyLogEntry,
  now: Date = new Date()
): Promise<void> => {
  const dateKey = localDateKey(now);
  const path = `${LOG_DIR}/${dateKey}.md`;
  const time = now.toTimeString().slice(0, 5);
  const line = `- ${time} ${entry.action}: ${entry.title}`;

  let existing = "";
  let sha: string | undefined;
  try {
    // その日の初回は必ず404になる（＝正常系）。Octokitは既定で404もコンソールに
    // エラーとして出すため、他の不具合を追うときにノイズになる。この呼び出しに限り
    // 404のログを止める（他のエラーは今までどおり出す）
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      request: {
        log: {
          ...console,
          warn: (...args: unknown[]) => console.warn(...args),
          error: (message?: unknown, ...args: unknown[]) => {
            if (typeof message === "string" && message.includes("404")) return;
            console.error(message, ...args);
          },
        },
      },
    });
    if (!Array.isArray(data) && "content" in data && typeof data.content === "string") {
      existing = decodeBase64(data.content);
      sha = data.sha;
    }
  } catch (err: unknown) {
    // 404はその日の初回なので新規作成に進む。それ以外は呼び出し側へ返す
    const status = (err as { status?: number })?.status;
    if (status !== 404) throw err;
  }

  const header = `# ${dateKey} の学習ログ\n\n`;
  const body = existing ? `${existing.trimEnd()}\n${line}\n` : `${header}${line}\n`;

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `study log ${dateKey}`,
    content: encodeBase64(body),
    ...(sha ? { sha } : {}),
  });
};
