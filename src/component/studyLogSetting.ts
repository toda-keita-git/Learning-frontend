// 「学習ログをGitHubへコミットするか」の設定。
//
// 自分のリポジトリに勝手にコミットされるのは驚きが大きいため、既定はオフにし、
// 設定画面で明示的にオンにしたときだけ動かす。
const KEY = "studyLogCommitEnabled";

export const isStudyLogCommitEnabled = (): boolean => {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    // プライベートモード等でlocalStorageが使えない場合は、オフとして扱う
    return false;
  }
};

export const setStudyLogCommitEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(KEY, enabled ? "true" : "false");
  } catch {
    // 保存できなくても致命的ではない（次回起動時に既定のオフへ戻るだけ）
  }
};
