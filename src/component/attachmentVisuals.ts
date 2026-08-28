import type { NoteAttachment } from "./PlanTypes";

// 目標・プラン・メモ本文などの記録はすべてDB(PostgreSQL)にあるが、
// 添付ファイルの「実体」だけはDBの外――GitHubリポジトリかGoogleドライブ――にある。
// DBに入っているのは「どちらにあるか」と「そこでの場所」を指す情報だけ。
//
// 1つのアカウントにGitHubとGoogleの両方を連携すると、1つのメモに両方の保存先の
// 添付が混在しうる。開いてみるまで保存先が分からないと混乱するため、
// 一覧の時点でアイコンとラベルの両方で保存先を明示する。
export const attachmentProviderLabel = (provider: NoteAttachment["provider"]): string =>
  provider === "google" ? "Drive" : "GitHub";
