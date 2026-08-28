// プラン（目標/アクションプランを統合した再帰構造）とメモ の型定義
// （バックエンドのsnake_caseフィールドをそのまま踏襲）

export interface CategoryOption {
  id: number;
  name: string;
}

export type PlanStatus = "not_started" | "in_progress" | "done" | "suspended";
export type NoteType = "learning" | "task" | "normal";
export type AttachmentKind = "image" | "code";

export interface Plan {
  id: number;
  parent_id: number | null; // null = ルート（目標として表示）
  title: string;
  description: string | null;
  status: PlanStatus;
  sort_order: number;
  created_at: string;
  user_id: number;
  // 直属メモ・子プランから再帰的に算出。対象が無ければnull（"未設定"）
  progress: number | null;
}

export interface NoteTodoItem {
  id?: number;
  note_id?: number;
  label: string;
  checked: boolean;
  sort_order?: number;
}

export interface NoteAttachment {
  id?: number;
  note_id?: number;
  kind: AttachmentKind;
  // providerが"google"の場合、github_pathにはDriveのfileIdを、repo_nameには
  // drive_folder_idを流用して保存する（カラム名はGitHub由来のままだが、
  // リネームによる影響範囲拡大を避けるための意図的な流用）
  github_path: string;
  commit_sha: string | null;
  repo_name: string;
  sort_order?: number;
  provider?: "github" | "google"; // 省略時はgithub扱い（既存データとの後方互換）
}

export interface Note {
  id: number;
  type: NoteType;
  title: string;
  body: string | null;
  mastery: number | null;
  progress: number | null;
  category_id: number | null;
  // nullなら繰り返しなし。設定時は「習慣リスト」タブでN日ごとのやることとして表示される（頻度は自由設定）
  review_interval_days: number | null;
  created_at: string;
  user_id: number;
  tags: string[];
  todo_items: NoteTodoItem[];
  links: number[]; // リンクしているプランIDの一覧（多対多）
  attachments: NoteAttachment[];
  // learning=習熟度そのまま / task=todo消化率(あれば)かprogress / normal=null
  effective_progress: number | null;
}

// 新規作成・更新時に送るペイロード（id等はサーバー側で確定する）
export type PlanInput = Pick<Plan, "parent_id" | "title" | "description" | "status">;
export type NoteInput = {
  type: NoteType;
  title: string;
  body: string | null;
  mastery: number | null;
  progress: number | null;
  category_id: number | null;
  review_interval_days: number | null;
  todo_items: NoteTodoItem[];
  tags: string[];
  // 作成時のみ有効（サーバーはnote_insertでこの2つをそのまま張ってくれる）。更新時はlink/unlink・attachment系APIを使う
  links?: number[];
  attachments?: NoteAttachment[];
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  done: "完了",
  suspended: "中断",
};

export const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  learning: "学習用",
  task: "チェック用",
  normal: "通常",
};
