// 目標 → アクションプラン → メモ の型定義（バックエンドのsnake_caseフィールドをそのまま踏襲）

export interface CategoryOption {
  id: number;
  name: string;
}

export type GoalStatus = "in_progress" | "achieved" | "suspended";
export type ActionPlanStatus = "not_started" | "in_progress" | "done";
export type NoteType = "learning" | "task" | "normal";

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  status: GoalStatus;
  created_at: string;
  user_id: number;
  // アクションプランの達成率から算出。対象が無ければnull（"未設定"）
  progress: number | null;
}

export interface ActionPlan {
  id: number;
  goal_id: number;
  title: string;
  priority: number;
  status: ActionPlanStatus;
  created_at: string;
  user_id: number;
  // 紐づくメモの実効進捗から算出。対象が無ければnull（"未設定"）
  progress: number | null;
}

export interface NoteTodoItem {
  id?: number;
  note_id?: number;
  label: string;
  checked: boolean;
  sort_order?: number;
}

export interface Note {
  id: number;
  action_plan_id: number | null;
  type: NoteType;
  title: string;
  body: string | null;
  mastery: number | null;
  progress: number | null;
  category_id: number | null;
  github_path: string | null;
  commit_sha: string | null;
  repo_name: string | null;
  created_at: string;
  user_id: number;
  todo_items: NoteTodoItem[];
  tags: string[];
  // learning=習熟度そのまま / task=todo消化率(あれば)かprogress / normal=null
  effective_progress: number | null;
}

// 新規作成・更新時に送るペイロード（id等はサーバー側で確定する）
export type GoalInput = Pick<Goal, "title" | "description" | "status">;
export type ActionPlanInput = Pick<ActionPlan, "goal_id" | "title" | "status">;
export type NoteInput = {
  action_plan_id: number | null;
  type: NoteType;
  title: string;
  body: string | null;
  mastery: number | null;
  progress: number | null;
  category_id: number | null;
  todo_items: NoteTodoItem[];
  tags: string[];
  github_path: string | null;
  commit_sha: string | null;
  repo_name: string | null;
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  in_progress: "進行中",
  achieved: "達成",
  suspended: "中断",
};

export const ACTION_PLAN_STATUS_LABEL: Record<ActionPlanStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  done: "完了",
};

export const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  learning: "学習用",
  task: "タスク用",
  normal: "通常",
};
